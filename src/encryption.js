import { base64UrlToBytes } from './crypto.js';

const ALLOWED_FIELDS = {
  random: ['algorithm', 'iv', 'keyMode', 'version'],
  passphrase: ['algorithm', 'iterations', 'iv', 'keyMode', 'salt', 'version'],
};

function hasExactFields(value, fields) {
  const actual = Object.keys(value).sort();
  return actual.length === fields.length
    && actual.every((field, index) => field === fields.slice().sort()[index]);
}

export function parseEncryptionMetadata(value) {
  let metadata = value;
  if (typeof value === 'string') {
    try {
      metadata = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  if (metadata.version !== 1 || metadata.algorithm !== 'AES-GCM') return null;
  if (!['random', 'passphrase'].includes(metadata.keyMode)) return null;

  const fields = ALLOWED_FIELDS[metadata.keyMode];
  if (!hasExactFields(metadata, fields)) return null;

  const iv = base64UrlToBytes(metadata.iv);
  if (!iv || iv.length !== 12) return null;

  if (metadata.keyMode === 'random') {
    return {
      version: 1,
      algorithm: 'AES-GCM',
      keyMode: 'random',
      iv: metadata.iv,
    };
  }

  const salt = base64UrlToBytes(metadata.salt);
  if (!salt || salt.length !== 16) return null;
  if (!Number.isInteger(metadata.iterations)
    || metadata.iterations < 100000
    || metadata.iterations > 600000) {
    return null;
  }

  return {
    version: 1,
    algorithm: 'AES-GCM',
    keyMode: 'passphrase',
    iv: metadata.iv,
    salt: metadata.salt,
    iterations: metadata.iterations,
  };
}

export function serializeEncryptionMetadata(metadata) {
  const parsed = parseEncryptionMetadata(metadata);
  return parsed ? JSON.stringify(parsed) : null;
}

export function safeViewerMetadata(metadata) {
  return JSON.stringify(metadata).replace(/</g, '\\u003c');
}