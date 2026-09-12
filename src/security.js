import { CONFIG } from './config.js';

export function getDatabase(env) {
  return env.DB || env.oh_my_share_db;
}

export function getBucket(env) {
  return env.MY_BUCKET || env.oh_my_share_bucket;
}

export async function checkRateLimit(env, ip, action, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const key = `${action}:${ip}:${bucket}`;
  const database = getDatabase(env);

  try {
    if (!database) throw new Error('D1 binding is not configured');

    const row = await database
      .prepare(
        `INSERT INTO rate_limits (key, count, expires_at)
         VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET count = count + 1
         RETURNING count`
      )
      .bind(key, now + windowSeconds * 2)
      .first();

    const count = row?.count || 1;
    return {
      allowed: count <= limit,
      count,
      remaining: Math.max(0, limit - count),
      retryAfter: windowSeconds - (now % windowSeconds),
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true, count: 0, remaining: 0, retryAfter: 0 };
  }
}

export function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') return null;

  const cleaned = slug.trim().toLowerCase();
  if (cleaned.length < CONFIG.SLUG_MIN || cleaned.length > CONFIG.SLUG_MAX) return null;
  if (!/^[a-z0-9-]+$/.test(cleaned)) return null;
  if (CONFIG.RESERVED_SLUGS.includes(cleaned)) return null;
  return cleaned;
}

export function generateId() {
  return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

export function applySecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(data), { status, headers });
}