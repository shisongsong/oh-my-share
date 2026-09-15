import { CONFIG } from '../config.js';
import { parseEncryptionMetadata } from '../encryption.js';
import { renderEncryptedViewer } from '../ui/viewer.js';
import { hashPassword, hashIp } from '../crypto.js';
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
              edit_token, password_hash, expires_at, updated_at
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
<title>${t.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg, #f5f5f0);
    color: var(--text, #1a1a1a);
    font-family: 'Silkscreen', monospace;
  }
  .pwd-box {
    background: var(--card, #ffffff);
    border: 3px solid var(--border, #1a1a1a);
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    text-align: center;
  }
  .pwd-box h2 {
    font-family: 'Press Start 2P', monospace;
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
  .pwd-box input {
    width: 100%;
    padding: 0.75rem;
    border: 3px solid var(--border, #1a1a1a);
    font-family: 'Silkscreen', monospace;
    font-size: 1rem;
    margin-bottom: 1rem;
    background: var(--input-bg, #fff);
    color: var(--text, #1a1a1a);
  }
  .pwd-box button {
    width: 100%;
    padding: 0.75rem;
    border: 3px solid var(--border, #1a1a1a);
    background: var(--gradient);
    color: white;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.8rem;
    cursor: pointer;
    text-transform: uppercase;
  }
  .pwd-box button:hover { opacity: 0.9; }
  .error { color: #ff5c7c; margin-bottom: 1rem; font-size: 0.8rem; }
</style>
</head>
<body>
<div class="pwd-box">
  <h2>${t.title}</h2>
  ${error ? `<p class="error">${t.error}</p>` : ''}
  <form method="POST" action="/api/verify-password/${id}">
    <input type="password" name="password" placeholder="${t.placeholder}" autofocus required>
    <button type="submit">${t.submit}</button>
  </form>
</div>
</body>
</html>`;
}

function renderExpiredPage(lang) {
  const messages = {
    zh: { title: '内容已过期', desc: '此分享内容已超过有效期，无法访问。' },
    en: { title: 'Content Expired', desc: 'This shared content has expired and is no longer accessible.' },
  };
  const t = messages[lang] || messages.en;
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg, #f5f5f0);
    color: var(--text, #1a1a1a);
    font-family: 'Silkscreen', monospace;
  }
  .expired-box {
    text-align: center;
    padding: 2rem;
    background: var(--card, #ffffff);
    border: 3px solid var(--border, #1a1a1a);
    max-width: 400px;
  }
  .expired-box h2 {
    font-family: 'Press Start 2P', monospace;
    font-size: 1rem;
    margin-bottom: 1rem;
  }
</style>
</head>
<body>
<div class="expired-box">
  <h2>${t.title}</h2>
  <p>${t.desc}</p>
</div>
</body>
</html>`;
}

export async function handleView(request, env) {
  const limited = await enforceViewRateLimit(request, env);
  if (limited) return limited;

  const url = new URL(request.url);
  const id = url.pathname.slice('/view/'.length);
  if (!validId(id)) return new Response('Invalid ID', { status: 400 });

  const lang = url.searchParams.get('lang') === 'zh' ? 'zh' : 'en';
  const record = await getFileRecord(env, id);
  if (!record) return new Response('Not Found', { status: 404 });

  // 检查是否过期
  if (isExpired(record)) {
    return new Response(renderExpiredPage(lang), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 检查是否需要密码
  if (record.password_hash) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(new RegExp(`osh_pwd_${id}=([a-f0-9]+)`));
    if (!match) {
      return new Response(renderPasswordPage(id, lang, false), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    const providedHash = match[1];
    if (providedHash !== record.password_hash) {
      return new Response(renderPasswordPage(id, lang, true), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
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
    return new Response(renderEncryptedViewer(id, metadata), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Surrogate-Control': 'no-store',
        'Content-Security-Policy':
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'none'",
        'X-Robots-Tag': 'noindex',
      },
    });
  }

  // 普通内容
  const object = await getBucket(env).get(id);
  if (!object) return new Response('Not Found', { status: 404 });

  await recordVisit(env, id, request);
  return new Response(object.body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Content-Security-Policy':
        'sandbox allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox',
      'X-Robots-Tag': 'noindex',
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
    const lang = url.searchParams.get('lang') === 'zh' ? 'zh' : 'en';
    return new Response(renderPasswordPage(id, lang, true), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
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
    },
  });
}
