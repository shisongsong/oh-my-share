import { BASE_CSS, renderNav, renderFooter, hreflangLinks, faqJsonLd } from '../ui/theme.js';
import { resolveLang } from '../i18n.js';
import { CONFIG } from '../config.js';
import { checkRateLimit, getClientIp, json } from '../security.js';
import { getCurrentUser, isSameOriginRequest } from '../auth.js';
import {
  findActiveKey,
  getOrCreateKey,
  getKeyUsage,
  revokeKeys,
  rotateKey,
} from '../api-keys.js';

const BASE_URL = 'https://openanthropic.com';
const PROXY_ENDPOINT = `${BASE_URL}/corsproxy?key=<KEY>&url=<URL>`;

export const CORS_RATE_PER_HOUR = CONFIG.RATE_CORS_PER_HOUR;
export const CORS_IP_RATE_PER_HOUR = CONFIG.RATE_CORS_IP_PER_HOUR;

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

function buildUpstreamHeaders(request, consumeAuthorization) {
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    const lower = name.toLowerCase();
    if (REQUEST_HEADER_STRIP.has(lower)) continue;
    if (lower.startsWith('cf-')) continue;
    // Authorization held the proxy key itself — never leak it to the target.
    if (consumeAuthorization && lower === 'authorization') continue;
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

function extractApiKey(request, url) {
  const query = url.searchParams.get('key');
  if (query) return query.trim();
  const auth = request.headers.get('Authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

async function proxyRequest(request, env) {
  const pageUrl = new URL(request.url);

  // Registration gate: every proxy call must carry a valid API key.
  const queryKey = (pageUrl.searchParams.get('key') || '').trim();
  const providedKey = queryKey || extractApiKey(request, pageUrl);
  // If Authorization carried the proxy key, it is consumed here and must not
  // be forwarded to the target (it would leak the key to any URL).
  const consumeAuthorization = !queryKey && !!providedKey;
  if (!providedKey) {
    return json(
      {
        error: `API key required — register free at ${BASE_URL}/corsproxy and copy your key`,
        code: 'errApiKeyRequired',
        docs: `${BASE_URL}/corsproxy`,
      },
      401,
      {
        'WWW-Authenticate': 'Bearer realm="corsproxy"',
        'Cache-Control': 'no-store',
      }
    );
  }
  const keyRow = await findActiveKey(env, providedKey);
  if (!keyRow) {
    return json(
      { error: 'Invalid or revoked API key', code: 'errApiKeyInvalid', docs: `${BASE_URL}/corsproxy` },
      401,
      { 'WWW-Authenticate': 'Bearer error="invalid_token"', 'Cache-Control': 'no-store' }
    );
  }

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
  const keyRate = await checkRateLimit(env, keyRow.id, 'cors-key-h', CORS_RATE_PER_HOUR, 3600);
  if (!keyRate.allowed) {
    return json(
      { error: `Rate limit exceeded — ${CORS_RATE_PER_HOUR} requests per hour per key`, code: 'errRateLimited' },
      429,
      {
        'Retry-After': String(keyRate.retryAfter),
        'X-RateLimit-Limit': String(CORS_RATE_PER_HOUR),
        'X-RateLimit-Remaining': '0',
        'Cache-Control': 'no-store',
      }
    );
  }

  // Backstop: one leaked key shared by many clients still trips the per-IP cap.
  const ipRate = await checkRateLimit(env, ip, 'cors-ip-h', CORS_IP_RATE_PER_HOUR, 3600);
  if (!ipRate.allowed) {
    return json(
      { error: `IP rate limit exceeded — ${CORS_IP_RATE_PER_HOUR} requests per hour per IP`, code: 'errIpRateLimited' },
      429,
      {
        'Retry-After': String(ipRate.retryAfter),
        'X-RateLimit-Limit': String(CORS_IP_RATE_PER_HOUR),
        'X-RateLimit-Remaining': '0',
        'Cache-Control': 'no-store',
      }
    );
  }

  const init = {
    method: request.method,
    headers: buildUpstreamHeaders(request, consumeAuthorization),
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
  headers.set('X-RateLimit-Remaining', String(keyRate.remaining));

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

// Console API: GET creates+returns the account's key, POST rotates it,
// DELETE revokes it. Session-authenticated via the shared osh_session cookie.
export async function handleCorsKeyApi(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return json({ error: 'Authentication required', code: 'errAuthRequired' }, 401, {
      'Cache-Control': 'no-store',
    });
  }

  const noStore = { 'Cache-Control': 'no-store' };

  if (request.method === 'GET') {
    const row = await getOrCreateKey(env, user.id);
    const used = await getKeyUsage(env, row.id);
    return json(
      {
        key: row.key,
        createdAt: row.created_at,
        usedHour: used,
        limitHour: CORS_RATE_PER_HOUR,
        ipLimitHour: CORS_IP_RATE_PER_HOUR,
      },
      200,
      noStore
    );
  }

  if (!isSameOriginRequest(request)) {
    return json({ error: 'Invalid origin' }, 403, noStore);
  }

  if (request.method === 'POST') {
    const row = await rotateKey(env, user.id);
    return json(
      {
        key: row.key,
        createdAt: row.created_at,
        usedHour: 0,
        limitHour: CORS_RATE_PER_HOUR,
        ipLimitHour: CORS_IP_RATE_PER_HOUR,
      },
      200,
      noStore
    );
  }

  if (request.method === 'DELETE') {
    await revokeKeys(env, user.id);
    return json({ ok: true }, 200, noStore);
  }

  return json({ error: 'Method not allowed' }, 405, noStore);
}

const LABELS = {
  en: {
    htmlLang: 'en',
    title: 'Free CORS Proxy — Fix Cross-Origin Errors in One URL | Oh My Share',
    desc: 'Free CORS proxy with API keys: register, copy your key and prefix any URL with openanthropic.com/corsproxy to fetch it from the browser without CORS errors. 100 requests per hour per key.',
    eyebrow: 'Free CORS proxy',
    h1a: 'Fix CORS errors with ',
    h1b: 'one URL prefix.',
    sub: 'Register for a free account, copy your API key, and prefix any API, image or page URL with our endpoint. The request runs server-side, comes back with Access-Control-Allow-Origin: *, and the response is streamed through — never stored.',
    endpointLabel: 'Endpoint',
    beforeTitle: 'Blocked by CORS',
    beforeCode: `// The browser refuses this call:
const res = await fetch('https://api.example.com/data');
// TypeError: Failed to fetch
// (no Access-Control-Allow-Origin header)`,
    afterTitle: 'Works through the proxy',
    afterCode: `// Same call, your key + one prefix:
const res = await fetch(
  'https://openanthropic.com/corsproxy?key=ck_YOUR_KEY&url=' +
    encodeURIComponent('https://api.example.com/data')
);
const data = await res.json(); // ✅ works from any origin`,
    howTitle: 'How it works',
    howSteps: [
      'Register a free account below and copy your API key — one key per account, rotate or revoke it any time.',
      'Your browser requests openanthropic.com/corsproxy?key=…&url=… instead of the target directly.',
      'The Cloudflare Worker validates your key, fetches the target server-side and returns the response with Access-Control-Allow-Origin: *.',
    ],
    playTitle: 'Try it now',
    playNote: 'The request below goes through the real proxy with your key — this page is the same origin, so what you get is exactly what your app would get.',
    playPlaceholder: 'https://example.com',
    playKeyPlaceholder: 'ck_your_api_key (auto-filled after signing in)',
    playBtn: 'Fetch through proxy',
    playRunning: 'Fetching…',
    playNeedKey: 'No API key yet — register below (or paste your key) and try again.',
    paramsTitle: 'Parameters & limits',
    paramsNote: 'A free account and API key are required — keys can be rotated or revoked from the console above at any time.',
    colItem: 'Item',
    colDetail: 'Detail',
    rows: [
      ['key', 'Required. Your API key from the console above — pass as ?key= or Authorization: Bearer.'],
      ['url', 'Required. Absolute http(s) URL, URL-encoded — everything after ?url= is the target.'],
      ['Method', 'GET, HEAD, POST, PUT, PATCH and DELETE are forwarded to the target as-is.'],
      ['Request headers', 'Forwarded to the target — except Cookie, Origin, Host and forwarding headers. Authorization is forwarded too, unless it carries the proxy key (then it is consumed and dropped).'],
      ['Response headers', 'Passed through, plus Access-Control-Allow-Origin: *. Set-Cookie, CSP and HSTS are dropped so they can’t affect this origin.'],
      ['Rate limit', '100 requests per hour per key, plus a 300 requests per hour per IP backstop. Responses include X-RateLimit-Remaining; 429 responses carry Retry-After.'],
      ['Storage', 'The response body is streamed straight back to you — this service keeps no copy.'],
      ['Blocked targets', 'Private, loopback and link-local addresses (127.0.0.1, 10.x, 172.16–31.x, 192.168.x, 169.254.x, localhost…) and openanthropic.com itself.'],
    ],
    faqTitle: 'Common questions',
    faq: [
      ['Do I need an account?', 'Yes — create a free account in the console above, copy your API key and pass it with every request (?key=). No credit card, no paid plan.'],
      ['What problem does this solve?', 'Browsers block fetch() calls to another origin unless that server replies with Access-Control-Allow-Origin. This proxy fetches the URL server-side and adds that header for you.'],
      ['Is it free?', 'Yes — 100 requests per hour per key, no credit card. Rotate or revoke your key any time from the console.'],
      ['Do you store the responses?', 'No. The response is streamed through and discarded — nothing is written to storage or kept for analytics.'],
      ['Can I call authenticated APIs?', 'Yes — pass the proxy key as ?key= and send Authorization for the target; it is forwarded untouched. If Authorization carries the proxy key itself, it is consumed and never forwarded. Cookie and Origin are stripped so your session on this site never leaks.'],
      ['Why is my target rejected?', 'Only http(s) public targets are allowed. Private/loopback network addresses and requests back to openanthropic.com are blocked to prevent abuse.'],
    ],
    copy: 'Copy',
    copied: 'Copied',
    copyFail: 'Copy failed — select and copy manually',
    backTop: 'Back to app',
    ctaDemo: 'Watch the real demo',
    ctaMcp: 'MCP guide',
    keyTitle: 'Get your API key',
    keyNote: 'A free account is required to use the proxy. Create one, copy the key below, and send it with every request.',
    keySteps: [
      'Register (or sign in) with email and password below.',
      'Copy your API key — it is created automatically on first sign-in.',
      'Pass the key as ?key=… on every proxy request.',
    ],
    keyLoggedIn: 'Signed in as',
    keyLabel: 'Your API key',
    keyUsage: 'Used {n} / {limit} this hour',
    keyCopy: 'Copy key',
    keyRotate: 'Regenerate',
    keyRevoke: 'Revoke',
    keyRotateDone: 'New key created — the old one no longer works.',
    keyRevokeDone: 'Key revoked. Sign in again to create a new one.',
    keySignInTitle: 'Sign in to get your key',
    keyRegisterTitle: 'Create a free account',
    keyEmail: 'Email',
    keyPassword: 'Password',
    keySubmitLogin: 'Sign in',
    keySubmitRegister: 'Create account & get key',
    keySwitchToRegister: 'No account? Register',
    keySwitchToLogin: 'Already registered? Sign in',
    keyAuthError: 'Authentication failed',
    keyLogout: 'Sign out',
  },
  zh: {
    htmlLang: 'zh-CN',
    title: '免费 CORS 代理 — 一个 URL 前缀终结跨域报错 | Oh My Share',
    desc: '带 API Key 的免费 CORS 代理：注册账号复制 Key，任意地址加上 openanthropic.com/corsproxy 即可在浏览器里 fetch。每 Key 每小时 100 次。',
    eyebrow: '免费 CORS 代理',
    h1a: '一个 URL 前缀，',
    h1b: '终结跨域报错。',
    sub: '免费注册账号、复制 API Key，把任意 API、图片或页面地址加上我们的端点。请求由服务端发出，带着 Access-Control-Allow-Origin: * 返回，响应全程透传 — 不落盘、不缓存。',
    endpointLabel: '端点',
    beforeTitle: '被 CORS 拦截',
    beforeCode: `// 浏览器直接拒绝这个请求：
const res = await fetch('https://api.example.com/data');
// TypeError: Failed to fetch
// （缺少 Access-Control-Allow-Origin 响应头）`,
    afterTitle: '加上代理即可',
    afterCode: `// 同样的请求，你的 Key + 一个前缀：
const res = await fetch(
  'https://openanthropic.com/corsproxy?key=ck_你的KEY&url=' +
    encodeURIComponent('https://api.example.com/data')
);
const data = await res.json(); // ✅ 任何来源都能调通`,
    howTitle: '工作原理',
    howSteps: [
      '在下方注册免费账号并复制 API Key — 每个账号一把 Key，可随时重新生成或撤销。',
      '浏览器不再直连目标地址，而是请求 openanthropic.com/corsproxy?key=…&url=…。',
      'Cloudflare Worker 校验 Key 后在服务端发起真实请求，响应带着 Access-Control-Allow-Origin: * 回到你的 fetch()。',
    ],
    playTitle: '立即试试',
    playNote: '下面的请求会带上你的 Key 走线上真实代理 — 本页与代理同源，你看到的结果就是你的应用会拿到的结果。',
    playPlaceholder: 'https://example.com',
    playKeyPlaceholder: 'ck_你的_API_Key（登录后自动填入）',
    playBtn: '通过代理请求',
    playRunning: '请求中…',
    playNeedKey: '还没有 API Key — 先在下方注册（或粘贴你的 Key），再试一次。',
    paramsTitle: '参数与限制',
    paramsNote: '必须注册免费账号并携带 API Key — Key 可在上方控制台随时重新生成或撤销。',
    colItem: '项目',
    colDetail: '说明',
    rows: [
      ['key', '必填。上方控制台的 API Key — 以 ?key= 或 Authorization: Bearer 传递。'],
      ['url', '必填。目标的绝对 http(s) 地址，需 URL 编码 — ?url= 之后的全部内容即目标地址。'],
      ['请求方法', 'GET、HEAD、POST、PUT、PATCH、DELETE 原样转发给目标。'],
      ['请求头', '除 Cookie、Origin、Host 及转发标识头外全部转发；Authorization 也会转发，除非它装的是代理 key（此时被代理消费、不外传）。'],
      ['响应头', '原样透传并附加 Access-Control-Allow-Origin: *；丢弃 Set-Cookie、CSP、HSTS，避免污染本站源。'],
      ['限速', '每 Key 每小时 100 次，另加每 IP 每小时 300 次兜底。响应带 X-RateLimit-Remaining；触发 429 时返回 Retry-After。'],
      ['数据存储', '响应体直接流式返回给调用方 — 本服务不留任何副本。'],
      ['禁止的目标', '私网 / 回环 / 链路本地地址（127.0.0.1、10.x、172.16–31.x、192.168.x、169.254.x、localhost…）以及 openanthropic.com 自身。'],
    ],
    faqTitle: '常见问题',
    faq: [
      ['必须注册账号吗？', '是 — 在上方控制台免费注册（或登录），Key 会自动创建，复制后随每次请求携带（?key=）。无需信用卡，无付费计划。'],
      ['它解决什么问题？', '浏览器要求目标服务器返回 Access-Control-Allow-Origin 才允许 fetch 跨域请求。这个代理在服务端替你取回数据并补上该响应头。'],
      ['免费吗？', '免费 — 每 Key 每小时 100 次，无需信用卡。Key 可在控制台随时重新生成或撤销。'],
      ['会存储响应数据吗？', '不会。响应流式透传后即丢弃 — 不写入存储，也不用于统计。'],
      ['能调需要鉴权的 API 吗？', '可以 — 代理 key 用 ?key= 传递，Authorization 会原样转发给目标；若 Authorization 装的是代理 key，会被代理消费而不转发。Cookie 与 Origin 会被剥离，你在本站的登录态不会泄露。'],
      ['为什么我的目标被拒绝？', '只允许 http(s) 公网地址。私网/回环地址以及指回 openanthropic.com 的请求会被拒绝，防止代理被滥用。'],
    ],
    copy: '复制',
    copied: '已复制',
    copyFail: '复制失败 — 请手动选择复制',
    backTop: '回到应用',
    ctaDemo: '看真实演示',
    ctaMcp: 'MCP 接入',
    keyTitle: '获取你的 API Key',
    keyNote: '使用代理需要免费账号。注册后在下方复制 Key，每次请求携带即可。',
    keySteps: [
      '在下方用邮箱密码注册（或登录）。',
      '复制你的 API Key — 首次登录会自动创建。',
      '每次代理请求带上 ?key=…。',
    ],
    keyLoggedIn: '已登录',
    keyLabel: '你的 API Key',
    keyUsage: '本小时已用 {n} / {limit}',
    keyCopy: '复制 Key',
    keyRotate: '重新生成',
    keyRevoke: '撤销',
    keyRotateDone: '已生成新 Key — 旧 Key 即刻失效。',
    keyRevokeDone: 'Key 已撤销。重新登录即可生成新的。',
    keySignInTitle: '登录获取 Key',
    keyRegisterTitle: '注册免费账号',
    keyEmail: '邮箱',
    keyPassword: '密码',
    keySubmitLogin: '登录',
    keySubmitRegister: '注册并获取 Key',
    keySwitchToRegister: '还没有账号？注册',
    keySwitchToLogin: '已有账号？登录',
    keyAuthError: '认证失败',
    keyLogout: '退出登录',
  },
};

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageScript(t) {
  const S = JSON.stringify({
    needKey: t.playNeedKey,
    usage: t.keyUsage,
    rotateDone: t.keyRotateDone,
    revokeDone: t.keyRevokeDone,
    authError: t.keyAuthError,
    loginTitle: t.keySignInTitle,
    registerTitle: t.keyRegisterTitle,
    submitLogin: t.keySubmitLogin,
    submitRegister: t.keySubmitRegister,
    switchToRegister: t.keySwitchToRegister,
    switchToLogin: t.keySwitchToLogin,
    who: t.keyLoggedIn,
  });

  return `
(function () {
  var S = ${S};
  var STORE_KEY = 'osh_cors_key';

  function msg(el, text, cls) {
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.className = 'ck-msg' + (cls ? ' ' + cls : '');
  }

  // ---------- playground ----------
  var form = document.getElementById('pgForm');
  var urlInput = document.getElementById('pgUrl');
  var keyInput = document.getElementById('pgKey');
  var btn = document.getElementById('pgBtn');
  var out = document.getElementById('pgOut');

  try {
    var saved = localStorage.getItem(STORE_KEY);
    if (saved && keyInput && !keyInput.value) keyInput.value = saved;
  } catch (e) {}

  if (keyInput) {
    keyInput.addEventListener('change', function () {
      try { localStorage.setItem(STORE_KEY, (keyInput.value || '').trim()); } catch (e) {}
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = (urlInput.value || '').trim();
      var key = (keyInput.value || '').trim();
      if (!raw) return;
      if (!key) { out.textContent = S.needKey; return; }
      if (!/^https?:\\/\\//i.test(raw)) raw = 'https://' + raw;
      urlInput.value = raw;
      try { localStorage.setItem(STORE_KEY, key); } catch (err) {}
      btn.disabled = true;
      out.classList.add('busy');
      out.textContent = '…';
      var started = performance.now();
      fetch('/corsproxy?key=' + encodeURIComponent(key) + '&url=' + encodeURIComponent(raw))
        .then(function (resp) {
          return resp.text().then(function (text) {
            var ms = Math.round(performance.now() - started);
            var ct = resp.headers.get('content-type') || '?';
            var remaining = resp.headers.get('x-ratelimit-remaining');
            var preview = text.length > 2000 ? text.slice(0, 2000) + '\\n… (' + text.length + ' chars total)' : text;
            out.textContent = 'HTTP ' + resp.status + '  ·  ' + ms + ' ms  ·  ' + ct +
              (remaining !== null ? '  ·  remaining: ' + remaining : '') +
              '\\n\\n' + preview;
            if (resp.status === 401) out.textContent += '\\n\\n' + S.needKey;
            out.classList.remove('busy');
          });
        })
        .catch(function (err) {
          out.textContent = 'Error: ' + err.message;
          out.classList.remove('busy');
        })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ---------- key console ----------
  var loggedOut = document.getElementById('ckLoggedOut');
  var loggedIn = document.getElementById('ckLoggedIn');
  var authForm = document.getElementById('ckAuthForm');
  var authTitle = document.getElementById('ckAuthTitle');
  var authSubmit = document.getElementById('ckSubmit');
  var authSwitch = document.getElementById('ckSwitch');
  var authMsg = document.getElementById('ckMsg');
  var keyField = document.getElementById('ckKeyInput');
  var usageEl = document.getElementById('ckUsage');
  var noticeEl = document.getElementById('ckNotice');
  var whoEl = document.getElementById('ckWho');
  var authMode = 'login';
  var currentEmail = '';

  function showLoggedOut() {
    if (loggedOut) loggedOut.hidden = false;
    if (loggedIn) loggedIn.hidden = true;
  }

  function showLoggedIn(data, email) {
    currentEmail = email || currentEmail;
    if (loggedOut) loggedOut.hidden = true;
    if (loggedIn) loggedIn.hidden = false;
    if (whoEl) whoEl.textContent = currentEmail || '—';
    if (data && data.key) {
      if (keyField) keyField.value = data.key;
      try { localStorage.setItem(STORE_KEY, data.key); } catch (e) {}
      if (keyInput && !keyInput.value) keyInput.value = data.key;
      if (usageEl) {
        msg(usageEl, S.usage.replace('{n}', data.usedHour).replace('{limit}', data.limitHour), '');
      }
    }
  }

  function api(path, opts) {
    return fetch(path, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, opts || {})).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        return { status: r.status, data: d };
      });
    });
  }

  function loadKey(email) {
    return api('/api/cors-key').then(function (res) {
      if (res.status === 200 && res.data) showLoggedIn(res.data, email);
      else showLoggedOut();
    }).catch(function () { showLoggedOut(); });
  }

  api('/api/auth/me').then(function (res) {
    if (res.data && res.data.user) loadKey(res.data.user.email);
    else showLoggedOut();
  }).catch(function () { showLoggedOut(); });

  if (authForm) {
    authForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (document.getElementById('ckEmail').value || '').trim();
      var password = document.getElementById('ckPassword').value || '';
      var endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      authSubmit.disabled = true;
      msg(authMsg, '…', '');
      api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email: email, password: password })
      }).then(function (res) {
        authSubmit.disabled = false;
        if (res.status === 200 || res.status === 201) {
          msg(authMsg, '', '');
          return loadKey(email);
        }
        msg(authMsg, (res.data && res.data.error) || S.authError, 'err');
      }).catch(function () {
        authSubmit.disabled = false;
        msg(authMsg, S.authError, 'err');
      });
    });
  }

  if (authSwitch) {
    authSwitch.addEventListener('click', function () {
      authMode = authMode === 'login' ? 'register' : 'login';
      if (authTitle) authTitle.textContent = authMode === 'login' ? S.loginTitle : S.registerTitle;
      if (authSubmit) authSubmit.textContent = authMode === 'login' ? S.submitLogin : S.submitRegister;
      authSwitch.textContent = authMode === 'login' ? S.switchToRegister : S.switchToLogin;
      msg(authMsg, '', '');
    });
  }

  var copyKeyBtn = document.getElementById('ckCopyKey');
  if (copyKeyBtn) {
    copyKeyBtn.addEventListener('click', function () {
      if (!keyField || !keyField.value) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(keyField.value);
      } else {
        keyField.select();
        try { document.execCommand('copy'); } catch (e) {}
      }
      copyKeyBtn.textContent = copyKeyBtn.getAttribute('data-done') || '✓';
      setTimeout(function () { copyKeyBtn.textContent = copyKeyBtn.getAttribute('data-label') || 'Copy'; }, 1600);
    });
  }

  var rotateBtn = document.getElementById('ckRotate');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', function () {
      rotateBtn.disabled = true;
      api('/api/cors-key', { method: 'POST' }).then(function (res) {
        rotateBtn.disabled = false;
        if (res.status === 200 && res.data) {
          showLoggedIn(res.data);
          msg(noticeEl, S.rotateDone, 'ok');
        } else {
          msg(noticeEl, (res.data && res.data.error) || S.authError, 'err');
        }
      });
    });
  }

  var revokeBtn = document.getElementById('ckRevoke');
  if (revokeBtn) {
    revokeBtn.addEventListener('click', function () {
      if (!window.confirm('Revoke / 撤销?')) return;
      revokeBtn.disabled = true;
      api('/api/cors-key', { method: 'DELETE' }).then(function () {
        revokeBtn.disabled = false;
        if (keyField) keyField.value = '';
        if (usageEl) msg(usageEl, '', '');
        try { localStorage.removeItem(STORE_KEY); } catch (e) {}
        if (keyInput) keyInput.value = '';
        showLoggedOut();
        msg(noticeEl, S.revokeDone, 'ok');
      });
    });
  }

  var logoutBtn = document.getElementById('ckLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      api('/api/auth/logout', { method: 'POST' }).then(function () {
        showLoggedOut();
      });
    });
  }
})();
`;
}

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

  const keyStepsHtml = t.keySteps
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
${hreflangLinks(BASE_URL, '/corsproxy')}
${faqJsonLd(t.faq)}
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
.ck-title {
  font-size: 14px; font-weight: 650; margin-bottom: var(--space-3);
  color: var(--color-text);
}
.ck-label {
  display: block; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--color-text-secondary); margin-bottom: 7px;
}
.ck-form { display: grid; gap: 10px; margin-bottom: 10px; }
.ck-form input {
  font-size: 14px; color: var(--color-text);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 11px 18px;
  outline: none;
}
.ck-form input:focus { border-color: rgba(255, 92, 124, 0.55); }
.ck-form .btn { border: none; cursor: pointer; }
.ck-mini {
  font-size: 12.5px; font-weight: 600;
  color: var(--color-text-secondary);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 7px 14px; cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}
.ck-mini:hover { color: var(--color-text); background: rgba(255,255,255,0.12); }
.ck-mini.danger:hover { color: #ff8ea0; border-color: rgba(255, 92, 124, 0.5); }
.ck-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.ck-msg { font-size: 12.5px; color: var(--color-text-secondary); margin: 10px 2px 0; line-height: 1.6; }
.ck-msg.err { color: #ff8ea0; }
.ck-msg.ok { color: #2bb8ab; }
.ck-switch {
  background: none; border: none; padding: 0;
  font-size: 13px; color: var(--color-link); cursor: pointer;
}
.pg-form { display: grid; gap: 10px; }
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

  <section class="cors-section" id="key-console">
    <h2>${esc(t.keyTitle)}</h2>
    <p>${esc(t.keyNote)}</p>
    <ol class="cors-steps">
${keyStepsHtml}
    </ol>

    <div class="pg-box" id="ckLoggedOut" hidden>
      <div class="ck-title" id="ckAuthTitle">${esc(t.keySignInTitle)}</div>
      <form id="ckAuthForm" class="ck-form">
        <input id="ckEmail" type="email" placeholder="${esc(t.keyEmail)}" autocomplete="email" required>
        <input id="ckPassword" type="password" placeholder="${esc(t.keyPassword)}" minlength="8" autocomplete="current-password" required>
        <button class="btn" type="submit" id="ckSubmit">${esc(t.keySubmitLogin)}</button>
      </form>
      <button class="ck-switch" type="button" id="ckSwitch">${esc(t.keySwitchToRegister)}</button>
      <p class="ck-msg" id="ckMsg" hidden></p>
    </div>

    <div class="pg-box" id="ckLoggedIn" hidden>
      <div class="ck-title">${esc(t.keyLoggedIn)}: <span id="ckWho">—</span></div>
      <span class="ck-label">${esc(t.keyLabel)}</span>
      <div class="pg-row">
        <input id="ckKeyInput" type="text" readonly spellcheck="false" aria-label="${esc(t.keyLabel)}">
        <button class="btn" type="button" id="ckCopyKey" data-label="${esc(t.keyCopy)}" data-done="✓">${esc(t.keyCopy)}</button>
      </div>
      <div class="ck-actions">
        <button class="ck-mini" type="button" id="ckRotate">${esc(t.keyRotate)}</button>
        <button class="ck-mini danger" type="button" id="ckRevoke">${esc(t.keyRevoke)}</button>
        <button class="ck-mini" type="button" id="ckLogout">${esc(t.keyLogout)}</button>
      </div>
      <p class="ck-msg" id="ckUsage" hidden></p>
      <p class="ck-msg" id="ckNotice" hidden></p>
    </div>
  </section>

  <section class="cors-section">
    <h2>${esc(t.playTitle)}</h2>
    <p>${esc(t.playNote)}</p>
    <div class="pg-box">
      <form id="pgForm" class="pg-form">
        <div class="pg-row">
          <input id="pgKey" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(t.playKeyPlaceholder)}" aria-label="API key">
        </div>
        <div class="pg-row">
          <input id="pgUrl" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(t.playPlaceholder)}" aria-label="Target URL">
          <button type="submit" class="btn" id="pgBtn">${esc(t.playBtn)}</button>
        </div>
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
<script>${pageScript(t)}</script>
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
