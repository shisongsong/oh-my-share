import { CONFIG } from './config.js';
import { bytesToBase64Url, base64UrlToBytes, sha256 } from './crypto.js';
import { getDatabase } from './security.js';

export const SESSION_COOKIE = 'osh_session';

const passwordEncoder = new TextEncoder();
const DUMMY_PASSWORD_SALT = new Uint8Array(16);

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function sessionCookie(token, request, maxAge = CONFIG.SESSION_TTL_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

async function derivePasswordHash(password, salt) {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: CONFIG.PASSWORD_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );
  return new Uint8Array(hash);
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

export function validatePassword(password) {
  return typeof password === 'string'
    && password.length >= CONFIG.MIN_PASSWORD_LENGTH
    && password.length <= CONFIG.MAX_PASSWORD_LENGTH;
}

export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const hash = await derivePasswordHash(password, salt);
  return {
    hash: bytesToBase64Url(hash),
    salt: bytesToBase64Url(salt),
  };
}

export async function verifyPassword(password, encodedHash, encodedSalt) {
  const salt = base64UrlToBytes(encodedSalt);
  const expected = base64UrlToBytes(encodedHash);
  if (!salt || !expected) return false;
  const actual = await derivePasswordHash(password, salt);
  return equalBytes(actual, expected);
}

export async function createSession(request, env, userId) {
  const database = getDatabase(env);
  if (!database) throw new Error('D1 binding is not configured');

  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64Url(tokenBytes);
  const tokenHash = bytesToBase64Url(await sha256(token));
  const createdAt = nowSeconds();
  const expiresAt = createdAt + CONFIG.SESSION_TTL_SECONDS;

  await database
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(tokenHash, userId, createdAt, expiresAt)
    .run();

  return {
    token,
    expiresAt,
    cookie: sessionCookie(token, request),
  };
}

export async function getCurrentUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const database = getDatabase(env);
  if (!database) throw new Error('D1 binding is not configured');

  const tokenHash = bytesToBase64Url(await sha256(token));
  const user = await database
    .prepare(
      `SELECT users.id, users.email, users.created_at
       FROM sessions
       INNER JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`
    )
    .bind(tokenHash, nowSeconds())
    .first();

  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
  };
}

export async function revokeSession(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    const database = getDatabase(env);
    if (database) {
      const tokenHash = bytesToBase64Url(await sha256(token));
      await database
        .prepare('DELETE FROM sessions WHERE token_hash = ?')
        .bind(tokenHash)
        .run();
    }
  }

  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function verifyPasswordWithDummy(password, user) {
  if (!user) {
    await derivePasswordHash(password, DUMMY_PASSWORD_SALT);
    return false;
  }
  return verifyPassword(password, user.password_hash, user.password_salt);
}