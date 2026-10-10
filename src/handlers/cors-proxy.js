import { BASE_CSS, renderNav, renderFooter } from '../ui/theme.js';
import { resolveLang } from '../i18n.js';
import { checkRateLimit, getClientIp, json } from '../security.js';

const BASE_URL = 'https://openanthropic.com';
const PROXY_ENDPOINT = `${BASE_URL}/corsproxy?url=`;

export const CORS_RATE_PER_HOUR = 60;

// Headers never forwarded to the upstream target. Cookie/Origin are stripped so
// a visitor's session on this site can't leak; cf-* / x-forwarded-* identify the
// edge, not the caller, so they stay behind too.
const REQUEST_HEADER_STRIP = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'cookie',
  'origin',
  'referer',
  'content-length',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
  'cf-ew-via',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-real-ip',
]);

// Headers dropped from the upstream response. Cookies would be set on THIS
// origin, CSP/HSTS would apply to THIS origin, and access-control-* are
// replaced with our own. content-length is dropped because the body is
// re-wrapped as a stream.
const RESPONSE_HEADER_STRIP = new Set([
  'set-cookie',
  'set-cookie2',
  'content-security-policy',
  'content-security-policy-report-only',
  'strict-transport-security',
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-allow-credentials',
  'access-control-expose-headers',
  'access-control-max-age',
  'content-length',
  'clear-site-data',
  'nel',
  'report-to',
  'reporting-endpoints',
  'alt-svc',
]);

function isBlockedHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'openanthropic.com' || host.endsWith('.openanthropic.com')) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.localdomain') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }
  return isPrivateIpLiteral(host);
}

function isPrivateIpLiteral(host) {
  const h = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const octets = v4.slice(1).map(Number);
    if (octets.some((n) => n > 255)) return false;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }

  if (h.includes(':')) {
    const low = h.toLowerCase();
    if (low === '::' || low === '::1') return true;
    if (low.startsWith('fc') || low.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(low)) return true;
    if (low.startsWith('::ffff:')) {
      const mapped = low.slice('::ffff:'.length);
      if (mapped.includes('.')) return isPrivateIpLiteral(mapped);
      return true;
    }
    return false;
  }

  return false;
}

function buildUpstreamHeaders(request) {
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    const lower = name.toLowerCase();
    if (REQUEST_HEADER_STRIP.has(lower)) continue;
    if (lower.startsWith('cf-')) continue;
    headers.append(name, value);
  }
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'Mozilla/5.0 (compatible; openanthropic-cors-proxy/1.0)');
  }
  return headers;
}

function preflightResponse(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '*',
      'Access-Control-Max-Age': '86400',
      'X-Cors-Proxy': 'openanthropic.com',
      'X-RateLimit-Limit': String(CORS_RATE_PER_HOUR),
    },
  });
}

async function proxyRequest(request, env) {
  const pageUrl = new URL(request.url);
  const rawTarget = (pageUrl.searchParams.get('url') || '').trim();

  let target;
  try {
    target = new URL(rawTarget);
  } catch {
    return json({ error: 'Invalid url — pass an absolute http(s) URL' }, 400);
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return json({ error: 'Only http:// and https:// targets are supported' }, 400);
  }

  if (isBlockedHost(target.hostname)) {
    return json({ error: 'This target is not allowed (private network or self)' }, 403);
  }

  const ip = getClientIp(request);
  const rate = await checkRateLimit(env, ip, 'cors-h', CORS_RATE_PER_HOUR, 3600);
  if (!rate.allowed) {
    return json({ error: `Rate limit exceeded — ${CORS_RATE_PER_HOUR} requests per hour per IP` }, 429, {
      'Retry-After': String(rate.retryAfter),
      'X-RateLimit-Limit': String(CORS_RATE_PER_HOUR),
      'X-RateLimit-Remaining': '0',
      'Cache-Control': 'no-store',
    });
  }

  const init = {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    redirect: 'follow',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  let upstream;
  try {
    upstream = await fetch(target.toString(), init);
  } catch (error) {
    console.error('CORS proxy fetch failed:', error);
    return json({ error: 'Upstream fetch failed' }, 502);
  }

  // Stream the upstream body straight through (compressed payloads pass
  // through untouched as long as Content-Encoding stays intact).
  const headers = new Headers();
  for (const [name, value] of upstream.headers) {
    const lower = name.toLowerCase();
    if (RESPONSE_HEADER_STRIP.has(lower)) continue;
    headers.append(name, value);
  }
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Expose-Headers', '*');
  headers.set('X-Cors-Proxy', 'openanthropic.com');
  headers.set('X-RateLimit-Limit', String(CORS_RATE_PER_HOUR));
  headers.set('X-RateLimit-Remaining', String(rate.remaining));

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

const LABELS = {
  en: {
    htmlLang: 'en',
    title: 'Free CORS Proxy — Fix Cross-Origin Errors in One URL | Oh My Share',
    desc: 'Free CORS proxy: prefix any URL with openanthropic.com/corsproxy?url= and fetch it from the browser without CORS errors. 60 requests per hour per IP, no signup, nothing stored.',
    eyebrow: 'Free CORS proxy',
    h1a: 'Fix CORS errors with ',
    h1b: 'one URL prefix.',
    sub: 'Prefix any API, image or page URL with our endpoint and call it from your browser. The request runs server-side, comes back with Access-Control-Allow-Origin: *, and the response is streamed through — never stored.',
    endpointLabel: 'Endpoint',
    beforeTitle: 'Blocked by CORS',
    beforeCode: `// The browser refuses this call:
const res = await fetch('https://api.example.com/data');
// TypeError: Failed to fetch
// (no Access-Control-Allow-Origin header)`,
    afterTitle: 'Works through the proxy',
    afterCode: `// Same call, one prefix added:
const res = await fetch(
  'https://openanthropic.com/corsproxy?url=' +
    encodeURIComponent('https://api.example.com/data')
);
const data = await res.json(); // ✅ works from any origin`,
    howTitle: 'How it works',
    howSteps: [
      'Your browser requests openanthropic.com/corsproxy?url=… instead of the target directly.',
      'The Cloudflare Worker fetches the target server-side — no browser CORS check applies there.',
      'The response returns with Access-Control-Allow-Origin: * so your fetch() accepts it.',
    ],
    playTitle: 'Try it now',
    playNote: 'The request below goes through the real proxy — this page is the same origin, so what you get is exactly what your app would get.',
    playPlaceholder: 'https://example.com',
    playBtn: 'Fetch through proxy',
    playRunning: 'Fetching…',
    paramsTitle: 'Parameters & limits',
    paramsNote: 'No account, no API key — the proxy is anonymous and rate-limited per IP.',
    colItem: 'Item',
    colDetail: 'Detail',
    rows: [
      ['url', 'Required. Absolute http(s) URL, URL-encoded — everything after ?url= is the target.'],
      ['Method', 'GET, HEAD, POST, PUT, PATCH and DELETE are forwarded to the target as-is.'],
      ['Request headers', 'Forwarded to the target — except Cookie, Origin, Host and forwarding headers. Send Authorization to call authenticated APIs.'],
      ['Response headers', 'Passed through, plus Access-Control-Allow-Origin: *. Set-Cookie, CSP and HSTS are dropped so they can’t affect this origin.'],
      ['Rate limit', '60 requests per hour per IP. Responses include X-RateLimit-Remaining; 429 responses carry Retry-After.'],
      ['Storage', 'The response body is streamed straight back to you — this service keeps no copy.'],
      ['Blocked targets', 'Private, loopback and link-local addresses (127.0.0.1, 10.x, 172.16–31.x, 192.168.x, 169.254.x, localhost…) and openanthropic.com itself.'],
    ],
    faqTitle: 'Common questions',
    faq: [
      ['What problem does this solve?', 'Browsers block fetch() calls to another origin unless that server replies with Access-Control-Allow-Origin. This proxy fetches the URL server-side and adds that header for you.'],
      ['Is it free?', 'Yes — 60 requests per hour per IP, no account and no key. For sustained high volume, run the same code on your own Cloudflare Worker.'],
      ['Do you store the responses?', 'No. The response is streamed through and discarded — nothing is written to storage or kept for analytics.'],
      ['Can I call authenticated APIs?', 'Yes — send an Authorization header with the proxy request and it is forwarded. Cookie and Origin are stripped so your session on this site never leaks.'],
      ['Why is my target rejected?', 'Only http(s) public targets are allowed. Private/loopback network addresses and requests back to openanthropic.com are blocked to prevent abuse.'],
    ],
    copy: 'Copy',
    copied: 'Copied',
    copyFail: 'Copy failed — select and copy manually',
    backTop: 'Back to app',
    ctaDemo: 'Watch the real demo',
    ctaMcp: 'MCP guide',
  },
  zh: {
    htmlLang: 'zh-CN',
    title: '免费 CORS 代理 — 一个 URL 前缀终结跨域报错 | Oh My Share',
    desc: '免费 CORS 代理：任意地址加上 openanthropic.com/corsproxy?url= 即可在浏览器里 fetch，不再报跨域错误。每 IP 每小时 60 次，无需注册，响应不落盘。',
    eyebrow: '免费 CORS 代理',
    h1a: '一个 URL 前缀，',
    h1b: '终结跨域报错。',
    sub: '把任意 API、图片或页面地址加上我们的端点，浏览器里直接 fetch。请求由服务端发出，带着 Access-Control-Allow-Origin: * 返回，响应全程透传 — 不落盘、不缓存。',
    endpointLabel: '端点',
    beforeTitle: '被 CORS 拦截',
    beforeCode: `// 浏览器直接拒绝这个请求：
const res = await fetch('https://api.example.com/data');
// TypeError: Failed to fetch
// （缺少 Access-Control-Allow-Origin 响应头）`,
    afterTitle: '加上代理即可',
    afterCode: `// 同样的请求，只加一个前缀：
const res = await fetch(
  'https://openanthropic.com/corsproxy?url=' +
    encodeURIComponent('https://api.example.com/data')
);
const data = await res.json(); // ✅ 任何来源都能调通`,
    howTitle: '工作原理',
    howSteps: [
      '浏览器不再直连目标地址，而是请求 openanthropic.com/corsproxy?url=…。',
      'Cloudflare Worker 在服务端发起真实请求 — 服务端之间不存在浏览器 CORS 检查。',
      '响应带着 Access-Control-Allow-Origin: * 回到你的 fetch()，跨域错误消失。',
    ],
    playTitle: '立即试试',
    playNote: '下面的请求走的就是线上真实代理 — 本页与代理同源，你看到的结果就是你的应用会拿到的结果。',
    playPlaceholder: 'https://example.com',
    playBtn: '通过代理请求',
    playRunning: '请求中…',
    paramsTitle: '参数与限制',
    paramsNote: '无需账号、无需 API Key — 匿名可用，按 IP 限速。',
    colItem: '项目',
    colDetail: '说明',
    rows: [
      ['url', '必填。目标的绝对 http(s) 地址，需 URL 编码 — ?url= 之后的全部内容即目标地址。'],
      ['请求方法', 'GET、HEAD、POST、PUT、PATCH、DELETE 原样转发给目标。'],
      ['请求头', '除 Cookie、Origin、Host 及转发标识头外全部转发 — 可带 Authorization 调用需要鉴权的 API。'],
      ['响应头', '原样透传并附加 Access-Control-Allow-Origin: *；丢弃 Set-Cookie、CSP、HSTS，避免污染本站源。'],
      ['限速', '每 IP 每小时 60 次。响应带 X-RateLimit-Remaining；触发 429 时返回 Retry-After。'],
      ['数据存储', '响应体直接流式返回给调用方 — 本服务不留任何副本。'],
      ['禁止的目标', '私网 / 回环 / 链路本地地址（127.0.0.1、10.x、172.16–31.x、192.168.x、169.254.x、localhost…）以及 openanthropic.com 自身。'],
    ],
    faqTitle: '常见问题',
    faq: [
      ['它解决什么问题？', '浏览器要求目标服务器返回 Access-Control-Allow-Origin 才允许 fetch 跨域请求。这个代理在服务端替你取回数据并补上该响应头。'],
      ['免费吗？', '免费 — 每 IP 每小时 60 次，无需账号和 Key。需要更大用量可以照同样代码部署到自己的 Cloudflare Worker。'],
      ['会存储响应数据吗？', '不会。响应流式透传后即丢弃 — 不写入存储，也不用于统计。'],
      ['能调需要鉴权的 API 吗？', '可以 — 在代理请求上带 Authorization 即会转发；Cookie 与 Origin 会被剥离，你在本站的登录态不会泄露。'],
      ['为什么我的目标被拒绝？', '只允许 http(s) 公网地址。私网/回环地址以及指回 openanthropic.com 的请求会被拒绝，防止代理被滥用。'],
    ],
    copy: '复制',
    copied: '已复制',
    copyFail: '复制失败 — 请手动选择复制',
    backTop: '回到应用',
    ctaDemo: '看真实演示',
    ctaMcp: 'MCP 接入',
  },
};

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PLAYGROUND_SCRIPT = `
(function () {
  var form = document.getElementById('pgForm');
  if (!form) return;
  var input = document.getElementById('pgUrl');
  var btn = document.getElementById('pgBtn');
  var out = document.getElementById('pgOut');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = (input.value || '').trim();
    if (!raw) return;
    if (!/^https?:\\/\\//i.test(raw)) raw = 'https://' + raw;
    input.value = raw;
    btn.disabled = true;
    out.classList.add('busy');
    out.textContent = '…';
    var started = performance.now();
    fetch('/corsproxy?url=' + encodeURIComponent(raw))
      .then(function (resp) {
        return resp.text().then(function (text) {
          var ms = Math.round(performance.now() - started);
          var ct = resp.headers.get('content-type') || '?';
          var remaining = resp.headers.get('x-ratelimit-remaining');
          var preview = text.length > 2000 ? text.slice(0, 2000) + '\\n… (' + text.length + ' chars total)' : text;
          out.textContent = 'HTTP ' + resp.status + '  ·  ' + ms + ' ms  ·  ' + ct +
            (remaining !== null ? '  ·  remaining: ' + remaining : '') +
            '\\n\\n' + preview;
          out.classList.remove('busy');
        });
      })
      .catch(function (err) {
        out.textContent = 'Error: ' + err.message;
        out.classList.remove('busy');
      })
      .finally(function () { btn.disabled = false; });
  });
})();
`;

const COPY_SCRIPT = `
(function () {
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.getAttribute('data-copy'));
      if (!el) return;
      var text = el.textContent;
      var done = function () {
        btn.textContent = btn.getAttribute('data-copied');
        setTimeout(function () { btn.textContent = btn.getAttribute('data-copy-label'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { btn.textContent = btn.getAttribute('data-copy-fail'); });
      } else {
        btn.textContent = btn.getAttribute('data-copy-fail');
      }
    });
  });
})();
`;

function renderCorsPage(request) {
  const lang = resolveLang(request);
  const t = LABELS[lang] || LABELS.en;
  const other = lang === 'zh' ? 'en' : 'zh';

  const howHtml = t.howSteps
    .map((s) => `<li>${esc(s)}</li>`)
    .join('\n');

  const paramRows = t.rows
    .map(
      ([item, detail]) =>
        `<tr><td><code>${esc(item)}</code></td><td>${esc(detail)}</td></tr>`
    )
    .join('\n');

  const faqHtml = t.faq
    .map(
      ([q, a]) =>
        `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}">
<link rel="canonical" href="${BASE_URL}/corsproxy">
<meta property="og:site_name" content="Oh My Share">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${BASE_URL}/corsproxy">
<meta property="og:image" content="${BASE_URL}/og-image.png">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.desc)}">
<meta name="twitter:image" content="${BASE_URL}/og-image.png">
<style>${BASE_CSS}
.cors-main {
  max-width: 880px;
  margin: 0 auto;
  padding: clamp(26px, 4vw, 56px) var(--space-5) var(--space-10);
}
.cors-hero { text-align: center; margin-bottom: clamp(26px, 4vw, 44px); }
.cors-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 6px 14px; margin-bottom: var(--space-5);
}
.cors-eyebrow::before {
  content: ''; width: 7px; height: 7px; border-radius: 50%;
  background: var(--gradient-primary);
  box-shadow: 0 0 10px rgba(255, 92, 124, 0.8);
  animation: cors-pulse 2s ease-in-out infinite;
}
@keyframes cors-pulse { 50% { opacity: 0.3; } }
.cors-hero h1 {
  font-size: clamp(32px, 5vw, 50px);
  font-weight: 750; letter-spacing: -0.035em; line-height: 1.1;
  margin-bottom: var(--space-4);
}
.cors-hero h1 em {
  font-style: normal;
  background: var(--gradient-primary);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.cors-hero p {
  max-width: 640px; margin: 0 auto;
  color: var(--color-text-secondary);
  font-size: clamp(14px, 1.6vw, 16px); line-height: 1.75;
}
.cors-section { margin-top: clamp(30px, 5vw, 52px); }
.cors-section > h2 {
  font-size: clamp(20px, 2.6vw, 26px);
  font-weight: 730; letter-spacing: -0.02em;
  margin-bottom: var(--space-3);
}
.cors-section > p {
  color: var(--color-text-secondary);
  font-size: 15px; line-height: 1.75; max-width: 680px;
  margin-bottom: var(--space-4);
}
.endpoint-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 10px 10px 10px 18px;
  background: rgba(255,255,255,0.03);
  width: fit-content; max-width: 100%;
}
.endpoint-row code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13.5px; color: var(--color-text);
}
.code-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 720px) { .code-grid { grid-template-columns: 1fr; } }
.code-block { position: relative; }
.code-block pre {
  margin: 0; padding: 16px 18px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--color-hairline);
  border-radius: 12px;
  overflow: auto;
}
.code-block code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px; line-height: 1.7; color: var(--color-text);
  white-space: pre;
}
.code-label {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 7px;
}
.code-label .bad { color: #ff8ea0; }
.code-label .good { color: #2bb8ab; }
.copy-btn {
  font-size: 12px; font-weight: 600;
  color: var(--color-text-secondary);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 5px 12px; cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}
.copy-btn:hover { color: var(--color-text); background: rgba(255,255,255,0.12); }
.cors-steps {
  margin: 0; padding-left: 22px;
  display: flex; flex-direction: column; gap: 7px;
}
.cors-steps li { font-size: 14.5px; line-height: 1.7; color: var(--color-text); }
.cors-steps li::marker { color: var(--color-text-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
.pg-box {
  border: 1px solid var(--color-hairline-strong);
  border-radius: 16px;
  padding: clamp(16px, 3vw, 24px);
  background: rgba(255,255,255,0.03);
}
.pg-row { display: flex; gap: 10px; flex-wrap: wrap; }
.pg-row input {
  flex: 1; min-width: 240px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13.5px; color: var(--color-text);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 11px 18px;
  outline: none;
}
.pg-row input:focus { border-color: rgba(255, 92, 124, 0.55); }
.pg-row .btn { border: none; cursor: pointer; }
.pg-row .btn:disabled { opacity: 0.55; cursor: wait; }
.pg-out {
  margin-top: 14px; padding: 14px 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px; line-height: 1.65;
  color: var(--color-text);
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid var(--color-hairline);
  border-radius: 12px;
  min-height: 88px;
  white-space: pre-wrap; word-break: break-word;
  overflow: auto;
}
.pg-out.busy { opacity: 0.6; }
.params-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.params-table th {
  text-align: left; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--color-text-secondary); font-weight: 600;
  padding: 10px 12px; border-bottom: 1px solid var(--color-hairline-strong);
}
.params-table td { padding: 12px; border-bottom: 1px solid var(--color-hairline); vertical-align: top; }
.params-table tr:last-child td { border-bottom: none; }
.params-table code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px; color: #5ce1d4; white-space: nowrap;
}
.faq-item {
  border: 1px solid var(--color-hairline);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 10px;
  background: rgba(255,255,255,0.02);
}
.faq-item summary {
  cursor: pointer;
  font-size: 14.5px; font-weight: 600;
  list-style: none;
}
.faq-item summary::before { content: '+ '; color: var(--color-text-secondary); font-weight: 400; }
.faq-item[open] summary::before { content: '− '; }
.faq-item p { font-size: 14px; line-height: 1.7; color: var(--color-text-secondary); margin: 10px 0 0; }
.cors-cta {
  display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
  margin-top: clamp(30px, 5vw, 48px);
}
.cors-cta .btn { min-width: 160px; }
</style>
</head>
<body>
${renderNav(
  lang,
  '/corsproxy',
  `<a class="lang-switch" href="/corsproxy?lang=${other}">${other === 'zh' ? '中文' : 'EN'}</a>
   <a class="account-button" href="/">${esc(t.backTop)}</a>`
)}
<main class="cors-main">
  <header class="cors-hero">
    <span class="cors-eyebrow">${esc(t.eyebrow)}</span>
    <h1>${esc(t.h1a)}<em>${esc(t.h1b)}</em></h1>
    <p>${esc(t.sub)}</p>
  </header>

  <section class="cors-section">
    <div class="endpoint-row">
      <code id="endpoint-code">${esc(PROXY_ENDPOINT)}&lt;URL&gt;</code>
      <button type="button" class="copy-btn" data-copy="endpoint-code" data-copy-label="${esc(t.copy)}" data-copied="${esc(t.copied)}" data-copy-fail="${esc(t.copyFail)}">${esc(t.copy)}</button>
    </div>
  </section>

  <section class="cors-section">
    <div class="code-grid">
      <div class="code-block">
        <span class="code-label"><span class="bad">${esc(t.beforeTitle)}</span></span>
        <pre><code>${esc(t.beforeCode)}</code></pre>
      </div>
      <div class="code-block">
        <span class="code-label"><span class="good">${esc(t.afterTitle)}</span>
          <button type="button" class="copy-btn" data-copy="after-code" data-copy-label="${esc(t.copy)}" data-copied="${esc(t.copied)}" data-copy-fail="${esc(t.copyFail)}">${esc(t.copy)}</button>
        </span>
        <pre><code id="after-code">${esc(t.afterCode)}</code></pre>
      </div>
    </div>
  </section>

  <section class="cors-section">
    <h2>${esc(t.howTitle)}</h2>
    <ol class="cors-steps">
${howHtml}
    </ol>
  </section>

  <section class="cors-section">
    <h2>${esc(t.playTitle)}</h2>
    <p>${esc(t.playNote)}</p>
    <div class="pg-box">
      <form id="pgForm" class="pg-row">
        <input id="pgUrl" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(t.playPlaceholder)}" aria-label="Target URL">
        <button type="submit" class="btn" id="pgBtn">${esc(t.playBtn)}</button>
      </form>
      <div class="pg-out" id="pgOut">${esc(t.playPlaceholder)}</div>
    </div>
  </section>

  <section class="cors-section">
    <h2>${esc(t.paramsTitle)}</h2>
    <p>${esc(t.paramsNote)}</p>
    <div style="overflow-x:auto">
    <table class="params-table">
      <thead><tr><th>${esc(t.colItem)}</th><th>${esc(t.colDetail)}</th></tr></thead>
      <tbody>
${paramRows}
      </tbody>
    </table>
    </div>
  </section>

  <section class="cors-section">
    <h2>${esc(t.faqTitle)}</h2>
${faqHtml}
  </section>

  <div class="cors-cta">
    <a class="btn" href="/demo">${esc(t.ctaDemo)}</a>
    <a class="btn" href="/mcp-guide" style="background:transparent;border:1px solid var(--color-hairline-strong);color:var(--color-text)">${esc(t.ctaMcp)}</a>
    <a class="btn" href="/" style="background:transparent;border:1px solid var(--color-hairline-strong);color:var(--color-text)">${esc(t.backTop)}</a>
  </div>
</main>
${renderFooter(lang)}
<script>${PLAYGROUND_SCRIPT}</script>
<script>${COPY_SCRIPT}</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      Vary: 'Accept-Language, CF-IPCountry',
    },
  });
}

export async function handleCorsProxy(request, env) {
  if (request.method === 'OPTIONS') {
    return preflightResponse(request);
  }

  const url = new URL(request.url);

  // Dual behavior like corsproxy.io: with ?url= it proxies, without it serves
  // the product page (docs + interactive playground).
  if (!url.searchParams.has('url')) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ error: 'Missing url parameter' }, 400);
    }
    return renderCorsPage(request);
  }

  return proxyRequest(request, env);
}
