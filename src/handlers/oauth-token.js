import { generateEditToken } from '../crypto.js';
import { json } from '../security.js';
import { verifyPasswordWithDummy, createSession } from '../auth.js';

async function generateOAuthToken(env, userId) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, strftime('%s','now'), ?)`
  ).bind(token, userId, Math.floor(Date.now() / 1000) + 3600).run();

  return { token, expiresAt };
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

  const { grant_type, email, password } = params;

  if (grant_type === 'password') {
    if (!email || !password) {
      return json({ error: 'invalid_request', error_description: 'email and password required' }, 400);
    }

    const user = await env.DB.prepare(
      `SELECT id, email, password_hash, password_salt FROM users WHERE email = ?`
    ).bind(email.trim().toLowerCase()).first();

    const valid = await verifyPasswordWithDummy(password, user);
    if (!valid) {
      return json({ error: 'invalid_grant', error_description: 'Invalid credentials' }, 400);
    }

    const { token, expiresAt } = await generateOAuthToken(env, user.id);

    return json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'upload manage read',
    });
  }

  return json({ error: 'unsupported_grant_type', error_description: 'Supported: password' }, 400);
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
