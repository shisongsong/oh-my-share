import { getDatabase } from './security.js';

export function generateApiKey() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `ck_${hex}`;
}

const SELECT_KEY = 'SELECT id, user_id, key, created_at FROM api_keys';

export async function findActiveKey(env, key) {
  const database = getDatabase(env);
  if (!database || typeof key !== 'string' || !key.startsWith('ck_') || key.length > 64) {
    return null;
  }
  return database
    .prepare(`${SELECT_KEY} WHERE key = ? AND revoked_at IS NULL`)
    .bind(key)
    .first();
}

export async function getOrCreateKey(env, userId) {
  const database = getDatabase(env);
  const existing = await database
    .prepare(`${SELECT_KEY} WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`)
    .bind(userId)
    .first();
  if (existing) return existing;

  const now = Math.floor(Date.now() / 1000);
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    key: generateApiKey(),
    created_at: now,
  };
  await database
    .prepare('INSERT INTO api_keys (id, user_id, key, created_at) VALUES (?, ?, ?, ?)')
    .bind(row.id, row.user_id, row.key, row.created_at)
    .run();
  return row;
}

export async function rotateKey(env, userId) {
  const database = getDatabase(env);
  const now = Math.floor(Date.now() / 1000);
  await database
    .prepare('UPDATE api_keys SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .bind(now, userId)
    .run();

  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    key: generateApiKey(),
    created_at: now,
  };
  await database
    .prepare('INSERT INTO api_keys (id, user_id, key, created_at) VALUES (?, ?, ?, ?)')
    .bind(row.id, row.user_id, row.key, row.created_at)
    .run();
  return row;
}

export async function revokeKeys(env, userId) {
  const database = getDatabase(env);
  const result = await database
    .prepare('UPDATE api_keys SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .bind(Math.floor(Date.now() / 1000), userId)
    .run();
  return result?.meta?.changes || 0;
}

// Requests consumed by this key in the current hourly bucket (matches the
// key format used by checkRateLimit with action "cors-key-h").
export async function getKeyUsage(env, keyId) {
  const database = getDatabase(env);
  const bucket = Math.floor(Date.now() / 1000 / 3600);
  const row = await database
    .prepare('SELECT count FROM rate_limits WHERE key = ?')
    .bind(`cors-key-h:${keyId}:${bucket}`)
    .first();
  return row?.count || 0;
}
