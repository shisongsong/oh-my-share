import { CONFIG } from '../config.js';
import { BASE_CSS } from '../ui/theme.js';
import { resolveLang } from '../i18n.js';
import { parseEncryptionMetadata } from '../encryption.js';
import { renderEncryptedViewer } from '../ui/viewer.js';
import { hashPassword, hashIp } from '../crypto.js';
import { hasPaidEntitlement } from '../entitlements.js';
import {
  checkRateLimit,
  getBucket,
  getClientIp,
  getDatabase,
} from '../security.js';

function validId(id) {
  return Boolean(id) && /^[a-z0-9-]+$/i.test(id);
}

async function enforceViewRateLimit(request, env) {
  const limit = await checkRateLimit(
    env,
    getClientIp(request),
    'view-h',
    CONFIG.RATE_VIEW_PER_HOUR,
    3600
  );
  return limit.allowed ? null : new Response('Too many requests', {
    status: 429,
    headers: { 'Retry-After': String(limit.retryAfter) },
  });
}

async function getFileRecord(env, id) {
  const database = getDatabase(env);
  if (!database) return null;
  return database
    .prepare(
      `SELECT id, encrypted, encryption_version, encryption_metadata,
              title, description, tags, created_at, owner_id,
              edit_token, password_hash, expires_at, updated_at,
              reported_at
       FROM files
       WHERE id = ?`
    )
    .bind(id)
    .first();
}

function isExpired(record) {
  if (!record || !record.expires_at) return false;
  return Math.floor(Date.now() / 1000) > record.expires_at;
}

async function recordVisit(env, id, request) {
  try {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip);
    const userAgent = request.headers.get('User-Agent') || '';
    const country = request.headers.get('CF-IPCountry') || '';
    const now = Math.floor(Date.now() / 1000);
    const database = getDatabase(env);
    await database
      .prepare(
        `INSERT INTO visits (file_id, ip_hash, user_agent, country, visited_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, ipHash, userAgent.slice(0, 500), country, now)
      .run();
  } catch (e) {
    console.error('Stats recording failed:', e);
  }
}

const GATE_CSS = `
.gate-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  color: var(--color-text);
  padding: var(--space-5);
}
.gate-box {
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: var(--space-8);
  max-width: 400px;
  width: 100%;
  text-align: center;
}
.gate-box h2 {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-5);
}
.gate-box input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  background: var(--color-input);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 15px;
  margin-bottom: var(--space-3);
  transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
}
.gate-box input:focus {
  outline: none;
  border-color: var(--color-accent-pink);
  box-shadow: var(--shadow-glow);
}
.gate-box button {
  width: 100%;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--gradient-primary);
  color: #fff;
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-btn);
  transition: filter var(--duration-fast) ease, transform var(--duration-fast) ease;
}
.gate-box button:hover { filter: brightness(1.05); transform: translateY(-1px); }
.gate-box button:active { transform: translateY(0) scale(0.985); }
.gate-error {
  color: var(--error);
  margin-bottom: var(--space-3);
  font-size: 13.5px;
}
.gate-desc {
  color: var(--color-text-secondary);
  font-size: 14.5px;
  line-height: 1.6;
}
.gate-link {
  display: inline-block;
  margin-top: var(--space-5);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-link);
}
`;

function renderPasswordPage(id, lang, error) {
  const messages = {
    zh: {
      title: '需要密码',
      placeholder: '请输入密码',
      submit: '验证',
      error: '密码错误',
      back: '返回',
    },
    en: {
      title: 'Password Required',
      placeholder: 'Enter password',
      submit: 'Verify',
      error: 'Incorrect password',
      back: 'Back',
    },
  };
  const t = messages[lang] || messages.en;
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${t.title}</title>
<style>${BASE_CSS}
${GATE_CSS}</style>
</head>
<body>
<div class="gate-page">
  <div class="gate-box">
    <h2>${t.title}</h2>
    ${error ? `<p class="gate-error">${t.error}</p>` : ''}
    <form method="POST" action="/api/verify-password/${id}">
      <input type="password" name="password" placeholder="${t.placeholder}" autofocus required>
      <button type="submit">${t.submit}</button>
    </form>
  </div>
</div>
</body>
</html>`;
}

function renderExpiredPage(lang) {
  const messages = {
    zh: { title: '内容已过期', desc: '此分享内容已超过有效期，无法访问。', home: '返回首页' },
    en: { title: 'Content Expired', desc: 'This shared content has expired and is no longer accessible.', home: 'Back to Home' },
  };
  const t = messages[lang] || messages.en;
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${t.title}</title>
<style>${BASE_CSS}
${GATE_CSS}</style>
</head>
<body>
<div class="gate-page">
  <div class="gate-box">
    <h2>${t.title}</h2>
    <p class="gate-desc">${t.desc}</p>
    <a class="gate-link" href="/">${t.home}</a>
  </div>
</div>
</body>
</html>`;
}

function renderReportedPage(lang) {
  const messages = {
    zh: {
      title: '内容已下架',
      desc: '该内容因收到举报已暂时下架，正在人工审核。',
      appeal: '如果你是内容所有者且认为这是误判，请发送邮件至 1400875096@qq.com 申诉（请附内容 ID）。',
      home: '返回首页',
      report: '举报其他内容',
    },
    en: {
      title: 'Content Removed',
      desc: 'This content has been taken down after receiving a report and is under manual review.',
      appeal: 'If you are the content owner and believe this is a mistake, email 1400875096@qq.com to appeal (please include the content ID).',
      home: 'Back to Home',
      report: 'Report other content',
    },
  };
  const t = messages[lang] || messages.en;
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${t.title}</title>
<style>${BASE_CSS}
${GATE_CSS}</style>
</head>
<body>
<div class="gate-page">
  <div class="gate-box">
    <h2>${t.title}</h2>
    <p class="gate-desc">${t.desc}</p>
    <p class="gate-desc">${t.appeal}</p>
    <a class="gate-link" href="/">${t.home}</a>
    <a class="gate-link" href="/abuse">${t.report}</a>
  </div>
</div>
</body>
</html>`;
}

const BADGE_HTML = '<a href="/?utm_source=badge" target="_blank" rel="noopener" style="position:fixed;bottom:14px;right:14px;z-index:2147483647;background:#111827;color:#fff;font:600 12px/1.4 -apple-system,system-ui,sans-serif;padding:8px 14px;border-radius:999px;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.14);opacity:.92;">Made with Oh My Share</a>';

function injectBadge(html) {
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${BADGE_HTML}</body>`);
  }
  return html + BADGE_HTML;
}

function escMeta(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Link previews (Slack/X/Discord/WeChat) read og/twitter tags from the shared
// page. Most uploaded HTML ships without them, so we inject a block unless the
// author already defined og:title.
function buildSocialMeta({ id, title, description, origin }) {
  const effectiveTitle = (title || '').trim() || 'Shared on Oh My Share';
  const effectiveDesc = (description || '').trim();
  const url = `${origin}/view/${id}`;
  const image = `${origin}/og-image.png`;
  const lines = [
    `<meta property="og:site_name" content="Oh My Share">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${escMeta(url)}">`,
    `<meta property="og:title" content="${escMeta(effectiveTitle)}">`,
  ];
  if (effectiveDesc) {
    lines.push(`<meta property="og:description" content="${escMeta(effectiveDesc)}">`);
  }
  lines.push(
    `<meta property="og:image" content="${escMeta(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escMeta(effectiveTitle)}">`,
    `<meta name="twitter:image" content="${escMeta(image)}">`
  );
  return lines.join('\n');
}

function injectSocialMeta(html, meta) {
  if (/\bproperty\s*=\s*["']og:/i.test(html)) return html;
  if (/<\/head\s*>/i.test(html)) return html.replace(/<\/head\s*>/i, `${meta}</head>`);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${meta}`);
  return `${meta}\n${html}`;
}

export async function handleView(request, env) {
  const limited = await enforceViewRateLimit(request, env);
  if (limited) return limited;

  const url = new URL(request.url);
  const id = url.pathname.slice('/view/'.length);
  if (!validId(id)) return new Response('Invalid ID', { status: 400 });

  const lang = resolveLang(request);
  const record = await getFileRecord(env, id);
  if (!record) return new Response('Not Found', { status: 404 });

  // 被举报内容:451 已下架(可申诉)
  if (record.reported_at) {
    return new Response(renderReportedPage(lang), {
      status: 451,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store',
      },
    });
  }

  // 检查是否过期
  if (isExpired(record)) {
    return new Response(renderExpiredPage(lang), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }

  // 检查是否需要密码
  if (record.password_hash) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(new RegExp(`osh_pwd_${id}=([a-f0-9]+)`));
    if (!match) {
      return new Response(renderPasswordPage(id, lang, false), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex, nofollow',
          'Referrer-Policy': 'no-referrer',
        },
      });
    }
    const providedHash = match[1];
    if (providedHash !== record.password_hash) {
      return new Response(renderPasswordPage(id, lang, true), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex, nofollow',
          'Referrer-Policy': 'no-referrer',
        },
      });
    }
  }

  // 加密内容
  if (record && Number(record.encrypted) === 1) {
    await recordVisit(env, id, request);
    const metadata = parseEncryptionMetadata(record.encryption_metadata);
    if (!metadata || Number(record.encryption_version) !== metadata.version) {
      return new Response('Invalid encryption metadata', { status: 500 });
    }
    return new Response(renderEncryptedViewer(id, metadata, {
      title: record.title || '',
      description: record.description || '',
      origin: url.origin,
    }), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Surrogate-Control': 'no-store',
        'Content-Security-Policy':
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'none'",
        'X-Robots-Tag': 'noindex',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }

  // 普通内容
  const object = await getBucket(env).get(id);
  if (!object) return new Response('Not Found', { status: 404 });

  // Badge is injected for non-paid owners; fold badge state into the ETag
  // so 304 revalidation stays correct when entitlement changes.
  const ownerPaid = record.owner_id ? await hasPaidEntitlement(env, record.owner_id) : false;

  const updatedAt = (record?.updated_at || 0) * 1000;
  const etag = `"${id}-${record?.updated_at || 0}${ownerPaid ? '' : '-b'}"`;
  const lastModified = new Date(updatedAt).toUTCString();

  // Revalidate: strong/weak ETag echo (Cloudflare may downgrade strong → weak)
  const inboundEtag = (request.headers.get('if-none-match') || '').replace(/^W\//, '');
  const ifModifiedSince = Date.parse(request.headers.get('if-modified-since') || '');
  const notModified =
    (inboundEtag && inboundEtag === etag) ||
    (!inboundEtag && ifModifiedSince && ifModifiedSince >= updatedAt);
  if (notModified) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Last-Modified': lastModified,
        'Cache-Control': 'no-cache',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }

  await recordVisit(env, id, request);
  let body = await object.text();
  body = injectSocialMeta(body, buildSocialMeta({
    id,
    title: record.title || '',
    description: record.description || '',
    origin: url.origin,
  }));
  if (!ownerPaid) {
    body = injectBadge(body);
  }
  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      ETag: etag,
      'Last-Modified': lastModified,
      'Content-Security-Policy':
        'sandbox allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export async function handleVerifyPassword(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.slice('/api/verify-password/'.length);
  if (!validId(id)) return new Response('Invalid ID', { status: 400 });

  const record = await getFileRecord(env, id);
  if (!record) return new Response('Not Found', { status: 404 });
  if (!record.password_hash) return new Response('Not Found', { status: 404 });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response('Invalid form data', { status: 400 });
  }

  const password = (formData.get('password') || '').toString();
  const passwordHash = await hashPassword(password);

  if (passwordHash !== record.password_hash) {
    const lang = resolveLang(request);
    return new Response(renderPasswordPage(id, lang, true), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }

  // 密码正确，设置 cookie 并重定向
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `/view/${id}`,
      'Set-Cookie': `osh_pwd_${id}=${passwordHash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${CONFIG.SESSION_TTL_SECONDS}`,
    },
  });
}

export async function handlePublicContent(request, env) {
  const limited = await enforceViewRateLimit(request, env);
  if (limited) return limited;

  const url = new URL(request.url);
  const id = url.pathname.slice('/api/content/'.length);
  if (!validId(id)) return new Response('Invalid ID', { status: 400 });

  const record = await getFileRecord(env, id);
  if (!record || Number(record.encrypted) !== 1) {
    return new Response('Not Found', { status: 404 });
  }

  const object = await getBucket(env).get(id);
  if (!object) return new Response('Not Found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
