import { startTrialSubscription } from '../entitlements.js';
import { normalizeEmail } from '../auth.js';
import { bytesToBase64Url, sha256 } from '../crypto.js';

function generateCode() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Google OAuth
export async function handleGoogleAuth(request, env) {
  const url = new URL(request.url);
  const origin = url.origin;

  // Check if Google OAuth is configured
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json({ error: 'Google OAuth not configured' }, 501);
  }

  const redirectUri = `${origin}/oauth/google/callback`;
  const state = crypto.randomUUID();

  // Store state for verification (optional, continue even if it fails)
  try {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO oauth_states (state, provider, created_at, expires_at)
       VALUES (?, 'google', strftime('%s','now'), ?)`
    ).bind(state, Math.floor(Date.now() / 1000) + 600).run();
  } catch (e) {
    console.log('Failed to store state:', e);
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline');

  return Response.redirect(authUrl.toString(), 302);
}

export async function handleGoogleCallback(request, env) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(`Google login failed: ${error}`, { status: 400 });
    }

    if (!code) {
      return new Response('Missing authorization code', { status: 400 });
    }

    // Try to verify state, but continue even if verification fails
    if (state) {
      try {
        await env.DB.prepare(`DELETE FROM oauth_states WHERE state = ?`).bind(state).run();
      } catch (e) {
        // Continue even if deletion fails
      }
    }

    // Exchange code for tokens
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

    const responseText = await tokenResponse.text();
    let tokens;
    try {
      tokens = JSON.parse(responseText);
    } catch (e) {
      return new Response(`Google returned non-JSON: ${responseText.substring(0, 200)}`, { status: 500 });
    }
    if (!tokens.access_token) {
      return new Response(`Google token exchange failed: ${JSON.stringify(tokens)}`, { status: 500 });
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userText = await userResponse.text();
    let googleUser;
    try {
      googleUser = JSON.parse(userText);
    } catch (e) {
      return new Response(`Google userinfo API returned non-JSON: ${userText.substring(0, 200)}`, { status: 500 });
    }
    if (!googleUser.email) {
      return new Response('Failed to get user info from Google', { status: 500 });
    }

    // Create or update user
    const email = normalizeEmail(googleUser.email);

    // Check if user already exists
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

    // Create session
    const sessionToken = generateCode();
    const tokenHash = bytesToBase64Url(await sha256(sessionToken));
    await env.DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, strftime('%s','now'), ?)`
    ).bind(tokenHash, userId, Math.floor(Date.now() / 1000) + 86400).run();

    // Redirect to home page
    const redirectUrl = new URL(url.origin);
    redirectUrl.searchParams.set('oauth_success', 'google');

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        'Set-Cookie': `osh_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      },
    });
  } catch (e) {
    return new Response(`Internal error: ${e.message}\n${e.stack}`, { status: 500 });
  }
}

// GitHub OAuth
export async function handleGitHubAuth(request, env) {
  const url = new URL(request.url);
  const origin = url.origin;

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return json({ error: 'GitHub OAuth not configured' }, 501);
  }

  const redirectUri = `${origin}/oauth/github/callback`;
  const state = crypto.randomUUID();

  // Store state for verification
  try {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO oauth_states (state, provider, created_at, expires_at)
       VALUES (?, 'github', strftime('%s','now'), ?)`
    ).bind(state, Math.floor(Date.now() / 1000) + 600).run();
  } catch (e) {
    // Continue even if storage fails
    console.log('Failed to store state:', e);
  }

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'user:email');
  authUrl.searchParams.set('state', state);

  return Response.redirect(authUrl.toString(), 302);
}

export async function handleGitHubCallback(request, env) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(`GitHub login failed: ${error}`, { status: 400 });
    }

    if (!code) {
      return new Response('Missing authorization code', { status: 400 });
    }

    // Try to verify state, but continue even if verification fails
    if (state) {
      try {
        await env.DB.prepare(`DELETE FROM oauth_states WHERE state = ?`).bind(state).run();
      } catch (e) {
        // Continue even if deletion fails
      }
    }

    // Exchange code for tokens
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

    const responseText = await tokenResponse.text();
    let tokens;
    try {
      tokens = JSON.parse(responseText);
    } catch (e) {
      return new Response(`GitHub returned non-JSON: ${responseText.substring(0, 200)}`, { status: 500 });
    }
    if (!tokens.access_token) {
      return new Response(`GitHub token exchange failed: ${JSON.stringify(tokens)}`, { status: 500 });
    }

    // Get user emails
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'OhMyShare-OAuth',
      },
    });

    const emailsText = await emailsResponse.text();
    let emails;
    try {
      emails = JSON.parse(emailsText);
    } catch (e) {
      return new Response(`GitHub emails API returned non-JSON: ${emailsText.substring(0, 200)}`, { status: 500 });
    }
    const primaryEmail = emails.find(e => e.primary)?.email || (Array.isArray(emails) ? emails[0]?.email : null);

    if (!primaryEmail) {
      return new Response('Failed to get email from GitHub', { status: 500 });
    }

    // Create or update user
    const email = normalizeEmail(primaryEmail);

    // Check if user already exists
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

    // Create session
    const sessionToken = generateCode();
    const tokenHash = bytesToBase64Url(await sha256(sessionToken));
    await env.DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, strftime('%s','now'), ?)`
    ).bind(tokenHash, userId, Math.floor(Date.now() / 1000) + 86400).run();

    // Redirect to home page
    const redirectUrl = new URL(url.origin);
    redirectUrl.searchParams.set('oauth_success', 'github');

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        'Set-Cookie': `osh_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      },
    });
  } catch (e) {
    return new Response(`Internal error: ${e.message}\n${e.stack}`, { status: 500 });
  }
}
