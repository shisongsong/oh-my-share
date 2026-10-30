const encoder = new TextEncoder();

export function bytesToBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBytes(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (value.length % 4)) % 4);
  let binary;
  try {
    binary = atob(padded);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function sha256(value) {
  const input = typeof value === 'string' ? encoder.encode(value) : value;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
}

// Legacy page-password digest. Kept for verifying old rows; new passwords use
// hashPagePassword below.
export async function hashPassword(password) {
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function timingSafeEqual(a, b) {
  const left = typeof a === 'string' ? encoder.encode(a) : new Uint8Array(a);
  const right = typeof b === 'string' ? encoder.encode(b) : new Uint8Array(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] || 0) ^ (right[index] || 0);
  }
  return diff === 0;
}

export const PAGE_PASSWORD_ITERATIONS = 210000;

export async function hashPagePassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PAGE_PASSWORD_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2-sha256$${PAGE_PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPagePassword(password, stored) {
  if (!stored) return { valid: false, needsUpgrade: false };

  if (/^[a-f0-9]{64}$/.test(stored)) {
    const legacy = await hashPassword(password);
    return { valid: timingSafeEqual(legacy, stored), needsUpgrade: true };
  }

  const parts = String(stored).split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') {
    return { valid: false, needsUpgrade: false };
  }
  const iterations = Number.parseInt(parts[1], 10);
  const salt = base64UrlToBytes(parts[2]);
  const expected = base64UrlToBytes(parts[3]);
  if (!Number.isFinite(iterations) || iterations < 10000 || iterations > 1000000 || !salt || !expected) {
    return { valid: false, needsUpgrade: false };
  }

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      256
    )
  );
  return {
    valid: timingSafeEqual(bits, expected),
    needsUpgrade: iterations < PAGE_PASSWORD_ITERATIONS,
  };
}

// The view cookie must not contain the stored password hash, otherwise a cookie
// leak also hands over the material needed to crack the password offline.
export async function passwordCookieValue(storedHash) {
  const digest = await sha256(`osh-pwd-cookie:${storedHash}`);
  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashIp(ip) {
  const data = encoder.encode(ip + 'osh-salt-2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export function generateEditToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'edt_' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}