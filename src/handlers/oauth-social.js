import { startTrialSubscription } from '../entitlements.js';
import { normalizeEmail } from '../auth.js';
import { json } from '../security.js';
import { bytesToBase64Url, sha256, timingSafeEqual } from '../crypto.js';

const STATE_COOKIE = 'osh_oauth_state';
const STATE_TTL_SECONDS = 600;

function generateCode() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim();
    }
  }
  return '';
}

function stateCookie(state) {
  return `${STATE_COOKIE}=${state}; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=${STATE_TTL_SECONDS}`;
}

function clearStateCookie() {
  return `${STATE_COOKIE}=; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function appendCookies(headers, cookies) {
  for (const cookie of cookies) {
    if (cookie) headers.append('Set-Cookie', cookie);
  }
}

async function beginSocialAuth(env, provider, authUrl, request) {
  const url = new URL(request.url);
  const authIdParam = url.searchParams.get('auth_id') || '';
  const authId = /^[a-f0-9]{16}$/.test(authIdParam) ? authIdParam : null;
  const state = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  try {
    await env.DB.prepare(
      `INSERT INTO oauth_states (state, provider, auth_id, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(state, provider, authId, now, now + STATE_TTL_SECONDS).run();
  } catch (error) {
    console.error('Failed to store OAuth state:', error);
    return new Response('Sign-in is temporarily unavailable', { status: 503 });
  }

  const target = new URL(authUrl);
  target.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      'Set-Cookie': stateCookie(state),
      'Cache-Control': 'no-store',
    },
  });
}

// Validates the state query parameter against the HttpOnly cookie set when the
// flow began. The DB row additionally binds it to the provider and TTL.
async function consumeState(request, env, provider) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const cookie = readCookie(request, STATE_COOKIE);
  if (!state || !cookie || !timingSafeEqual(state, cookie)) return null;

  const row = await env.DB.prepare(
    `SELECT auth_id FROM oauth_states
     WHERE state = ? AND provider = ? AND expires_at > strftime('%s','now')`
  ).bind(state, provider).first();
  if (!row) return null;

  await env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
  return row;
}

async function completeSocialLogin(request, env, userId, authId, provider) {
  const url = new URL(request.url);
  const sessionToken = generateCode();
  const tokenHash = bytesToBase64Url(await sha256(sessionToken));
  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
     VALUES (?, ?, strftime('%s','now'), ?)`
  ).bind(tokenHash, userId, Math.floor(Date.now() / 1000) + 86400).run();

  let location;
  if (authId) {
    const pending = await env.DB.prepare(
      `SELECT code FROM oauth_codes
       WHERE code = ? AND user_id IS NULL AND expires_at > strftime('%s','now')`
    ).bind(authId).first();
    if (pending) {
      await env.DB.prepare(
        `UPDATE oauth_codes SET user_id = ? WHERE code = ? AND user_id IS NULL`
      ).bind(userId, authId).run();
      location = `${url.origin}/oauth/consent?auth_id=${encodeURIComponent(authId)}`;
    }
  }

  if (!location) {
    const home = new URL(url.origin);
    home.searchParams.set('oauth_success', provider);
    location = home.toString();
  }

  const headers = new Headers({
    Location: location,
    'Cache-Control': 'no-store',
  });
  appendCookies(headers, [
    `osh_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    clearStateCookie(),
  ]);
  return new Response(null, { status: 302, headers });
}

// Google OAuth
export async function handleGoogleAuth(request, env) {
  const url = new URL(request.url);

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json({ error: 'Google OAuth not configured' }, 501);
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', `${url.origin}/oauth/google/callback`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');

  return beginSocialAuth(env, 'google', authUrl, request);
}

export async function handleGoogleCallback(request, env) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response('Google login failed', { status: 400 });
    }
    if (!code) {
      return new Response('Missing authorization code', { status: 400 });
    }

    const stateRow = await consumeState(request, env, 'google');
    if (!stateRow) {
      return new Response('Invalid or expired sign-in state', { status: 400 });
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${url.origin}/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json().catch(() => null);
    if (!tokens?.access_token) {
      console.error('Google token exchange failed', tokenResponse.status);
      return new Response('Google login failed', { status: 502 });
    }

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userResponse.json().catch(() => null);
    if (!googleUser?.email || googleUser.verified_email === false) {
      return new Response('Failed to get a verified email from Google', { status: 502 });
    }

    const email = normalizeEmail(googleUser.email);
    const existingUser = await env.DB.prepare(
      `SELECT id FROM users WHERE email = ?`
    ).bind(email).first();

    let userId;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, password_salt, created_at)
         VALUES (?, ?, '', '', strftime('%s','now'))`
      ).bind(userId, email).run();
      await startTrialSubscription(env, userId);
    }

    return completeSocialLogin(request, env, userId, stateRow.auth_id, 'google');
  } catch (error) {
    console.error('Google callback error:', error);
    return new Response('Google login failed', { status: 500 });
  }
}

// GitHub OAuth
export async function handleGitHubAuth(request, env) {
  const url = new URL(request.url);

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return json({ error: 'GitHub OAuth not configured' }, 501);
  }

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', `${url.origin}/oauth/github/callback`);
  authUrl.searchParams.set('scope', 'user:email');

  return beginSocialAuth(env, 'github', authUrl, request);
}

export async function handleGitHubCallback(request, env) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response('GitHub login failed', { status: 400 });
    }
    if (!code) {
      return new Response('Missing authorization code', { status: 400 });
    }

    const stateRow = await consumeState(request, env, 'github');
    if (!stateRow) {
      return new Response('Invalid or expired sign-in state', { status: 400 });
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/oauth/github/callback`,
      }),
    });

    const tokens = await tokenResponse.json().catch(() => null);
    if (!tokens?.access_token) {
      console.error('GitHub token exchange failed', tokenResponse.status);
      return new Response('GitHub login failed', { status: 502 });
    }

    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'OhMyShare-OAuth',
      },
    });
    const emails = await emailsResponse.json().catch(() => null);
    const primaryEmail = Array.isArray(emails)
      ? (emails.find((entry) => entry.primary && entry.verified)?.email
        || emails.find((entry) => entry.verified)?.email)
      : null;

    if (!primaryEmail) {
      return new Response('Failed to get a verified email from GitHub', { status: 502 });
    }

    const email = normalizeEmail(primaryEmail);
    const existingUser = await env.DB.prepare(
      `SELECT id FROM users WHERE email = ?`
    ).bind(email).first();

    let userId;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, password_salt, created_at)
         VALUES (?, ?, '', '', strftime('%s','now'))`
      ).bind(userId, email).run();
      await startTrialSubscription(env, userId);
    }

    return completeSocialLogin(request, env, userId, stateRow.auth_id, 'github');
  } catch (error) {
    console.error('GitHub callback error:', error);
    return new Response('GitHub login failed', { status: 500 });
  }
}
