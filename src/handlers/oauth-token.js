import { json } from '../security.js';
import { verifyPasswordWithDummy } from '../auth.js';

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
    const authData = JSON.stringify({
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
      scope,
      created_at: Date.now(),
    });

    // Store in KV-like approach using D1
    await env.DB.prepare(
      `INSERT OR REPLACE INTO oauth_codes (code, user_id, client_id, redirect_uri, code_challenge, scope, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))`
    ).bind(authId, null, client_id, redirect_uri, code_challenge, scope, Math.floor(Date.now() / 1000) + 600, Math.floor(Date.now() / 1000)).run();

    // Redirect to login page with auth_id
    const loginUrl = `${url.origin}/oauth/login?auth_id=${authId}`;
    return Response.redirect(loginUrl, 302);
  }

  return json({ error: 'method_not_allowed' }, 405);
}

export async function handleOAuthLogin(request, env) {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const authId = url.searchParams.get('auth_id');
    if (!authId) {
      return new Response('Missing auth_id', { status: 400 });
    }

    const loginPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Oh My Share</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Silkscreen', monospace; background: #f5f5f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-box { background: white; border: 3px solid #1a1a1a; padding: 2rem; max-width: 400px; width: 90%; }
    h1 { font-family: 'Press Start 2P', monospace; font-size: 1rem; margin-bottom: 1.5rem; background: linear-gradient(90deg, #ff5c7c, #5ce1d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; font-size: 0.8rem; margin-bottom: 0.5rem; }
    input { width: 100%; padding: 0.75rem; border: 2px solid #1a1a1a; font-family: 'VT323', monospace; font-size: 1rem; background: #f5f5f0; }
    input:focus { outline: none; border-color: #ff5c7c; }
    button { width: 100%; padding: 0.75rem; border: 2px solid #1a1a1a; background: linear-gradient(90deg, #ff5c7c, #5ce1d4); color: white; font-family: 'Silkscreen', monospace; font-size: 0.9rem; cursor: pointer; font-weight: bold; }
    button:hover { opacity: 0.9; }
    .error { color: #ff5c7c; font-size: 0.8rem; margin-top: 0.5rem; }
    .register-link { text-align: center; margin-top: 1rem; font-size: 0.8rem; }
    .register-link a { color: #ff5c7c; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>Login</h1>
    <form method="POST" action="/oauth/login">
      <input type="hidden" name="auth_id" value="${authId}">
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" required autocomplete="email">
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required autocomplete="current-password">
      </div>
      <button type="submit">Login</button>
    </form>
    <div class="register-link">
      Don't have an account? <a href="/register">Register</a>
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

    if (!authId || !email || !password) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Get auth request
    const authRequest = await env.DB.prepare(
      `SELECT * FROM oauth_codes WHERE code = ? AND user_id IS NULL AND expires_at > strftime('%s','now')`
    ).bind(authId).first();

    if (!authRequest) {
      return new Response('Invalid or expired authorization request', { status: 400 });
    }

    // Verify user credentials
    const user = await env.DB.prepare(
      `SELECT id, email, password_hash, password_salt FROM users WHERE email = ?`
    ).bind(email.trim().toLowerCase()).first();

    const valid = await verifyPasswordWithDummy(password, user);
    if (!valid) {
      const errorPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Failed - Oh My Share</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Silkscreen', monospace; background: #f5f5f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-box { background: white; border: 3px solid #1a1a1a; padding: 2rem; max-width: 400px; width: 90%; }
    h1 { font-family: 'Press Start 2P', monospace; font-size: 1rem; margin-bottom: 1.5rem; color: #ff5c7c; }
    .error { color: #ff5c7c; margin-bottom: 1rem; }
    button { width: 100%; padding: 0.75rem; border: 2px solid #1a1a1a; background: #f5f5f0; font-family: 'Silkscreen', monospace; font-size: 0.9rem; cursor: pointer; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>Login Failed</h1>
    <p class="error">Invalid email or password</p>
    <a href="/oauth/login?auth_id=${authId}"><button>Try Again</button></a>
  </div>
</body>
</html>`;
      return new Response(errorPage, {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Generate authorization code
    const code = generateCode();

    // Store the code with user_id
    await env.DB.prepare(
      `UPDATE oauth_codes SET user_id = ?, code = ? WHERE code = ?`
    ).bind(user.id, code, authId).run();

    // Get the auth request details for redirect
    const updatedRequest = await env.DB.prepare(
      `SELECT redirect_uri, state FROM oauth_codes WHERE code = ?`
    ).bind(code).first();

    if (!updatedRequest) {
      return new Response('Failed to complete authorization', { status: 500 });
    }

    // Redirect back to client with code
    const redirectUrl = new URL(updatedRequest.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (updatedRequest.state) {
      redirectUrl.searchParams.set('state', updatedRequest.state);
    }

    return Response.redirect(redirectUrl.toString(), 302);
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
    await env.DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, strftime('%s','now'), ?)`
    ).bind(token, user.id, Math.floor(Date.now() / 1000) + 3600).run();

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
    await env.DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, strftime('%s','now'), ?)`
    ).bind(token, authCode.user_id, Math.floor(Date.now() / 1000) + 3600).run();

    return json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: authCode.scope || 'upload manage read',
    });
  }

  return json({ error: 'unsupported_grant_type', error_description: 'Supported: password, authorization_code' }, 400);
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
