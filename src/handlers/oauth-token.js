import { sha256 } from '../crypto.js';
import { json } from '../security.js';

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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

  const { grant_type, email, password, code } = params;

  if (grant_type === 'password') {
    if (!email || !password) {
      return json({ error: 'invalid_request', error_description: 'email and password required' }, 400);
    }

    const user = await env.DB.prepare(
      `SELECT id, email FROM users WHERE email = ? AND password_hash = ?`
    ).bind(email, await sha256(password)).first();

    if (!user) {
      return json({ error: 'invalid_grant', error_description: 'Invalid credentials' }, 400);
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    await env.DB.prepare(
      `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))`
    ).bind(token, user.id, expiresAt).run();

    return json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'upload manage read',
    });
  }

  if (grant_type === 'authorization_code') {
    if (!code) {
      return json({ error: 'invalid_request', error_description: 'code required' }, 400);
    }

    const session = await env.DB.prepare(
      `SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')`
    ).bind(code).first();

    if (!session) {
      return json({ error: 'invalid_grant', error_description: 'Invalid or expired code' }, 400);
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    await env.DB.prepare(
      `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))`
    ).bind(token, session.user_id, expiresAt).run();

    return json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'upload manage read',
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
  const session = await env.DB.prepare(
    `SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')`
  ).bind(token).first();

  return session ? session.user_id : null;
}
