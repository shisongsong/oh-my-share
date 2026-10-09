import { json } from '../security.js';
import { verifyPasswordWithDummy } from '../auth.js';
import { bytesToBase64Url, sha256 } from '../crypto.js';
import { BASE_CSS } from '../ui/theme.js';
import { I18N, resolveLang } from '../i18n.js';

const AUTH_CSS = `
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: var(--space-5);
}
.auth-box {
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: var(--space-8);
  max-width: 400px;
  width: 100%;
}
.auth-box h1 {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-align: center;
  margin-bottom: var(--space-6);
}
.auth-box .form-group {
  margin-bottom: var(--space-4);
}
.auth-box label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: var(--space-2);
  color: var(--color-text);
}
.auth-box input {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  background: var(--color-input);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 15px;
  transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
}
.auth-box input:focus {
  outline: none;
  border-color: var(--color-accent-pink);
  box-shadow: var(--shadow-glow);
}
.auth-box button[type=submit] {
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
.auth-box button[type=submit]:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
}
.auth-error {
  color: var(--error);
  font-size: 13.5px;
  margin-bottom: var(--space-3);
}
.auth-divider {
  display: flex;
  align-items: center;
  margin: var(--space-6) 0;
  color: var(--color-text-tertiary);
  font-size: 12.5px;
  gap: var(--space-3);
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--color-hairline);
}
.social-btn {
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 14.5px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
  transition: background var(--duration-fast) ease, transform var(--duration-fast) ease;
}
.social-btn:hover {
  background: var(--color-fill);
}
.social-btn:active {
  transform: scale(0.985);
}
.social-btn svg {
  width: 18px;
  height: 18px;
}
.auth-link {
  text-align: center;
  margin-top: var(--space-5);
  font-size: 13.5px;
  color: var(--color-text-secondary);
}
.auth-link a {
  color: var(--color-link);
  font-weight: 500;
}
.auth-btn-outline {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast) ease;
}
.auth-btn-outline:hover {
  background: var(--color-fill);
}
`;

function generateCode() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64urlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Base64Url(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(hash);
}

export async function handleOAuthAuthorize(request, env) {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const client_id = url.searchParams.get('client_id');
    const redirect_uri = url.searchParams.get('redirect_uri');
    const response_type = url.searchParams.get('response_type');
    const code_challenge = url.searchParams.get('code_challenge');
    const code_challenge_method = url.searchParams.get('code_challenge_method') || 'S256';
    const state = url.searchParams.get('state');
    const scope = url.searchParams.get('scope') || 'upload manage read';

    if (response_type !== 'code') {
      return json({ error: 'unsupported_response_type' }, 400);
    }

    if (!client_id || !redirect_uri || !code_challenge) {
      return json({ error: 'invalid_request', error_description: 'Missing required parameters' }, 400);
    }

    // Store auth request in session for the login page
    const authId = generateCode().slice(0, 16);

    // Store in KV-like approach using D1
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT OR REPLACE INTO oauth_codes (code, user_id, client_id, redirect_uri, code_challenge, code_challenge_method, scope, state, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(authId, null, client_id, redirect_uri, code_challenge, code_challenge_method || 'S256', scope, state || null, now + 600, now).run();

    // Redirect to login page with auth_id
    const loginUrl = `${url.origin}/oauth/login?auth_id=${authId}`;
    return Response.redirect(loginUrl, 302);
  }

  return json({ error: 'method_not_allowed' }, 405);
}

export async function handleOAuthLogin(request, env) {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    let authId = url.searchParams.get('auth_id');
    if (!authId) {
      // Generate a temporary auth_id if not provided
      authId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    const lang = resolveLang(request);
    const t = I18N[lang] || I18N.en;

    const loginPage = `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <title>Login - Oh My Share</title>
  <style>${BASE_CSS}
${AUTH_CSS}</style>
</head>
<body>
  <div class="auth-page">
    <div class="auth-box">
      <h1>${t.oauthLoginTitle}</h1>
      <a href="/oauth/google?auth_id=${authId}" style="text-decoration: none;">
        <button type="button" class="social-btn">
          <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          ${t.oauthGoogle}
        </button>
      </a>
      <a href="/oauth/github?auth_id=${authId}" style="text-decoration: none;">
        <button type="button" class="social-btn">
          <svg viewBox="0 0 24 24"><path fill="#1a1a1a" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          ${t.oauthGithub}
        </button>
      </a>
      <div class="auth-divider">${t.orContinueWith}</div>
      <form method="POST" action="/oauth/login">
        <input type="hidden" name="auth_id" value="${authId}">
        <div class="form-group">
          <label>${t.emailLabel}</label>
          <input type="email" name="email" required autocomplete="email">
        </div>
        <div class="form-group">
          <label>${t.passwordLabel}</label>
          <input type="password" name="password" required autocomplete="current-password">
        </div>
        <button type="submit">${t.oauthContinueEmail}</button>
      </form>
      <div class="auth-link">
        ${t.oauthNoAccount} <a href="/register">${t.oauthRegister}</a>
      </div>
    </div>
  </div>
</body>
</html>`;

    return new Response(loginPage, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (request.method === 'POST') {
    const formData = await request.formData();
    const authId = formData.get('auth_id');
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Get auth request (may be null for simple web login)
    const authRequest = authId ? await env.DB.prepare(
      `SELECT * FROM oauth_codes WHERE code = ? AND user_id IS NULL AND expires_at > strftime('%s','now')`
    ).bind(authId).first() : null;

    // Verify user credentials
    const user = await env.DB.prepare(
      `SELECT id, email, password_hash, password_salt FROM users WHERE email = ?`
    ).bind(email.trim().toLowerCase()).first();

    const valid = await verifyPasswordWithDummy(password, user);
    if (!valid) {
      const errLang = resolveLang(request);
      const et = I18N[errLang] || I18N.en;
      const errorPage = `<!DOCTYPE html>
<html lang="${errLang === 'zh' ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <title>${et.oauthLoginFailed} - Oh My Share</title>
  <style>${BASE_CSS}
${AUTH_CSS}</style>
</head>
<body>
  <div class="auth-page">
    <div class="auth-box">
      <h1>${et.oauthLoginFailed}</h1>
      <p class="auth-error">${et.oauthInvalidCred}</p>
      <a href="/oauth/login?auth_id=${authId}" style="text-decoration: none;">
        <button type="button" class="auth-btn-outline">${et.oauthTryAgain}</button>
      </a>
    </div>
  </div>
</body>
</html>`;
      return new Response(errorPage, {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Generate session token for simple web login
    const sessionToken = generateCode();
    const tokenHash = bytesToBase64Url(await sha256(sessionToken));
    await env.DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, strftime('%s','now'), ?)`
    ).bind(tokenHash, user.id, Math.floor(Date.now() / 1000) + 86400).run();

    // If there's an auth request (from MCP/agent flow), handle redirect
    if (authRequest) {
      const code = generateCode();
      await env.DB.prepare(
        `UPDATE oauth_codes SET user_id = ?, code = ? WHERE code = ?`
      ).bind(user.id, code, authId).run();

      const updatedRequest = await env.DB.prepare(
        `SELECT redirect_uri, state FROM oauth_codes WHERE code = ?`
      ).bind(code).first();

      if (updatedRequest) {
        const redirectUrl = new URL(updatedRequest.redirect_uri);
        redirectUrl.searchParams.set('code', code);
        if (updatedRequest.state) {
          redirectUrl.searchParams.set('state', updatedRequest.state);
        }
        return Response.redirect(redirectUrl.toString(), 302);
      }
    }

    // Simple web login - redirect to home page with session cookie
    const redirectUrl = new URL(url.origin);
    redirectUrl.searchParams.set('oauth_success', '1');

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        'Set-Cookie': `osh_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      },
    });
  }

  return json({ error: 'method_not_allowed' }, 405);
}

export async function handleOAuthToken(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const contentType = request.headers.get('content-type') || '';
  let params;

  if (contentType.includes('application/json')) {
    params = await request.json();
  } else {
    const text = await request.text();
    params = Object.fromEntries(new URLSearchParams(text));
  }

  const { grant_type, email, password, code, redirect_uri, client_id, code_verifier } = params;

  // Password grant (for backwards compatibility)
  if (grant_type === 'password') {
    if (!email || !password) {
      return json({ error: 'invalid_request', error_description: 'email and password required' }, 400);
    }

    const user = await env.DB.prepare(
      `SELECT id, email, password_hash, password_salt FROM users WHERE email = ?`
    ).bind(email.trim().toLowerCase()).first();

    const { verifyPasswordWithDummy } = await import('../auth.js');
    const valid = await verifyPasswordWithDummy(password, user);
    if (!valid) {
      return json({ error: 'invalid_grant', error_description: 'Invalid credentials' }, 400);
    }

    const token = generateCode();
    const tokenHash = bytesToBase64Url(await sha256(token));
    await env.DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, strftime('%s','now'), ?)`
    ).bind(tokenHash, user.id, Math.floor(Date.now() / 1000) + 3600).run();

    return json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'upload manage read',
    });
  }

  // Authorization Code grant
  if (grant_type === 'authorization_code') {
    if (!code || !redirect_uri || !client_id) {
      return json({ error: 'invalid_request', error_description: 'Missing required parameters' }, 400);
    }

    const authCode = await env.DB.prepare(
      `SELECT * FROM oauth_codes WHERE code = ? AND client_id = ? AND redirect_uri = ? AND user_id IS NOT NULL AND expires_at > strftime('%s','now')`
    ).bind(code, client_id, redirect_uri).first();

    if (!authCode) {
      return json({ error: 'invalid_grant', error_description: 'Invalid or expired code' }, 400);
    }

    // Verify PKCE if code_challenge was provided
    if (authCode.code_challenge && code_verifier) {
      const challenge = await sha256Base64Url(code_verifier);
      if (challenge !== authCode.code_challenge) {
        return json({ error: 'invalid_grant', error_description: 'Invalid code_verifier' }, 400);
      }
    }

    // Delete the used code
    await env.DB.prepare(`DELETE FROM oauth_codes WHERE code = ?`).bind(code).run();

    // Generate access token
    const token = generateCode();
    const tokenHash = bytesToBase64Url(await sha256(token));
    await env.DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, strftime('%s','now'), ?)`
    ).bind(tokenHash, authCode.user_id, Math.floor(Date.now() / 1000) + 3600).run();

    return json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: authCode.scope || 'upload manage read',
    });
  }

  return json({ error: 'unsupported_grant_type', error_description: 'Supported: password, authorization_code' }, 400);
}

export async function handleOAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`Authorization failed: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  // Get the auth code details
  const authCode = await env.DB.prepare(
    `SELECT * FROM oauth_codes WHERE code = ? AND user_id IS NOT NULL AND expires_at > strftime('%s','now')`
  ).bind(code).first();

  if (!authCode) {
    return new Response('Invalid or expired authorization code', { status: 400 });
  }

  // Delete the used code
  await env.DB.prepare(`DELETE FROM oauth_codes WHERE code = ?`).bind(code).run();

  // Create a session for the user
  const sessionToken = generateCode();
  const tokenHash = bytesToBase64Url(await sha256(sessionToken));
  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, strftime('%s','now'), ?)`
  ).bind(tokenHash, authCode.user_id, Math.floor(Date.now() / 1000) + 86400).run();

  // Redirect to home page with session cookie
  const redirectUrl = new URL(url.origin);
  redirectUrl.searchParams.set('oauth_success', '1');

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
      'Set-Cookie': `osh_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    },
  });
}

export async function validateToken(request, env) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }

  const token = auth.slice(7);
  const user = await env.DB.prepare(
    `SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > strftime('%s','now')`
  ).bind(token).first();

  return user ? user.user_id : null;
}
