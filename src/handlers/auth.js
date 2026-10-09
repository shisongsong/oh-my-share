import { CONFIG } from '../config.js';
import { hasPaidEntitlement, startTrialSubscription} from '../entitlements.js';
import {
  createSession,
  getCurrentUser,
  isSameOriginRequest,
  normalizeEmail,
  revokeSession,
  validatePassword,
  verifyPasswordWithDummy,
  hashPassword,
} from '../auth.js';
import {
  checkRateLimit,
  getClientIp,
  getDatabase,
  json,
} from '../security.js';

function noStoreHeaders(extra = {}) {
  return { 'Cache-Control': 'no-store', ...extra };
}

function rateLimitResponse(limit) {
  return json(
    { error: 'Too many authentication attempts' },
    429,
    noStoreHeaders({ 'Retry-After': String(limit.retryAfter) })
  );
}

async function checkAuthRateLimit(request, env) {
  const limit = await checkRateLimit(
    env,
    getClientIp(request),
    'auth-h',
    CONFIG.RATE_AUTH_PER_HOUR,
    3600
  );
  return limit.allowed ? null : rateLimitResponse(limit);
}

async function readCredentials(request) {
  try {
    if ((request.headers.get('Content-Type') || '').includes('application/json')) {
      return await request.json();
    }

    const formData = await request.formData();
    return {
      email: formData.get('email'),
      password: formData.get('password'),
    };
  } catch {
    return null;
  }
}

function invalidCredentialsResponse() {
  return json({ error: 'Invalid email or password' }, 400, noStoreHeaders());
}

function userResponse(user, status, session) {
  return json(
    {
      user: {
        id: user.id,
        email: user.email,
      },
    },
    status,
    noStoreHeaders({ 'Set-Cookie': session.cookie })
  );
}

export async function handleRegister(request, env) {
  if (!isSameOriginRequest(request)) return json({ error: 'Invalid origin' }, 403);

  const limited = await checkAuthRateLimit(request, env);
  if (limited) return limited;

  const credentials = await readCredentials(request);
  const email = normalizeEmail(credentials?.email);
  const password = credentials?.password;
  if (!email || !validatePassword(password)) return invalidCredentialsResponse();

  const database = getDatabase(env);
  if (!database) return json({ error: 'Database unavailable' }, 503);

  const existing = await database
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first();
  if (existing) return json({ error: 'Email already registered' }, 409, noStoreHeaders());

  const id = crypto.randomUUID();
  const passwordData = await hashPassword(password);
  const createdAt = Math.floor(Date.now() / 1000);

  await database
    .prepare(
      `INSERT INTO users (id, email, password_hash, password_salt, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, email, passwordData.hash, passwordData.salt, createdAt)
    .run();

  await startTrialSubscription(env, id, createdAt);

  const session = await createSession(request, env, id);
  return userResponse({ id, email }, 201, session);
}

export async function handleLogin(request, env) {
  if (!isSameOriginRequest(request)) return json({ error: 'Invalid origin' }, 403);

  const limited = await checkAuthRateLimit(request, env);
  if (limited) return limited;

  const credentials = await readCredentials(request);
  const email = normalizeEmail(credentials?.email);
  const password = credentials?.password;
  if (!email || typeof password !== 'string') return invalidCredentialsResponse();

  const database = getDatabase(env);
  if (!database) return json({ error: 'Database unavailable' }, 503);

  const user = await database
    .prepare(
      `SELECT id, email, password_hash, password_salt
       FROM users
       WHERE email = ?`
    )
    .bind(email)
    .first();
  const valid = await verifyPasswordWithDummy(password, user);
  if (!valid) {
    return json({ error: 'Invalid email or password' }, 401, noStoreHeaders());
  }

  const session = await createSession(request, env, user.id);
  return userResponse(user, 200, session);
}

export async function handleLogout(request, env) {
  if (!isSameOriginRequest(request)) return json({ error: 'Invalid origin' }, 403);

  const cookie = await revokeSession(request, env);
  return json(
    { ok: true },
    200,
    noStoreHeaders({ 'Set-Cookie': cookie })
  );
}

export async function handleCurrentUser(request, env) {
  const user = await getCurrentUser(request, env);
  const canEncrypt = user ? await hasPaidEntitlement(env, user.id) : false;

  return json(
    {
      user: user ? { id: user.id, email: user.email } : null,
      plan: canEncrypt ? 'paid' : 'free',
      canEncrypt,
    },
    200,
    noStoreHeaders()
  );
}

export async function handleListShares(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ error: 'Authentication required' }, 401, noStoreHeaders());

  const database = getDatabase(env);
  if (!database) return json({ error: 'Database unavailable' }, 503);

  const shares = await database
    .prepare(
      `SELECT id, title, edit_token, created_at, expires_at
       FROM files
       WHERE owner_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    )
    .bind(user.id)
    .all();

  return json(
    { shares: shares.results || [] },
    200,
    noStoreHeaders()
  );
}