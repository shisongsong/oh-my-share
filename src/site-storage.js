import { CONFIG } from './config.js';

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  xhtml: 'application/xhtml+xml; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  wasm: 'application/wasm',
  zip: 'application/zip',
  webmanifest: 'application/manifest+json',
  ics: 'text/calendar; charset=utf-8',
};

const IGNORED_FILES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);
const IGNORED_SEGMENTS = new Set(['__macosx']);

export function sitePrefix(id) {
  return `site/${id}/`;
}

export function siteKey(id, path) {
  return `${sitePrefix(id)}${path}`;
}

export function contentTypeFor(path) {
  const name = String(path || '').split('/').pop() || '';
  const dot = name.lastIndexOf('.');
  if (dot === -1) return 'application/octet-stream';
  return CONTENT_TYPES[name.slice(dot + 1).toLowerCase()] || 'application/octet-stream';
}

export function isSandboxedDocumentType(type) {
  return /^text\/html\b/i.test(type) || /^application\/xhtml\+xml\b/i.test(type) || /^image\/svg\+xml\b/i.test(type);
}

export function isIgnoredSiteFile(path) {
  const parts = String(path || '').toLowerCase().split('/');
  if (!parts.length) return true;
  if (IGNORED_FILES.has(parts[parts.length - 1])) return true;
  return parts.some((part) => IGNORED_SEGMENTS.has(part));
}

// Normalizes a browser-provided relative path. Returns null when the path is
// absolute, contains traversal/dotfiles, or is otherwise unsafe to store.
export function normalizeSitePath(raw) {
  if (typeof raw !== 'string') return null;
  let path = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  while (path.startsWith('./')) path = path.slice(2);
  if (!path || path.length > CONFIG.SITE_MAX_PATH_LENGTH) return null;
  if (/[\u0000-\u001f\u007f]/.test(path)) return null;

  const parts = path.split('/');
  if (parts.length > CONFIG.SITE_MAX_PATH_DEPTH) return null;
  for (const part of parts) {
    if (!part || part === '.' || part === '..') return null;
    if (part.startsWith('.')) return null;
    if (part.length > 255) return null;
    if (IGNORED_SEGMENTS.has(part.toLowerCase())) return null;
  }
  return parts.join('/');
}

export async function deleteSiteObjects(bucket, id) {
  if (!bucket) return;
  const prefix = sitePrefix(id);
  let cursor;
  do {
    const listed = await bucket.list({ prefix, limit: 1000, cursor });
    if (listed.objects.length) {
      await bucket.delete(listed.objects.map((object) => object.key));
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}
