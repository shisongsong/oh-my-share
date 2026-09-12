import { CONFIG } from '../config.js';
import { parseEncryptionMetadata } from '../encryption.js';
import { renderEncryptedViewer } from '../ui/viewer.js';
import {
  checkRateLimit,
  getBucket,
  getClientIp,
  getDatabase,
} from '../security.js';

function validId(id) {
  return Boolean(id) && /^[a-z0-9-]+$/i.test(id);
}

async function enforceViewRateLimit(request, env) {
  const limit = await checkRateLimit(
    env,
    getClientIp(request),
    'view-h',
    CONFIG.RATE_VIEW_PER_HOUR,
    3600
  );
  return limit.allowed ? null : new Response('Too many requests', {
    status: 429,
    headers: { 'Retry-After': String(limit.retryAfter) },
  });
}

async function getFileRecord(env, id) {
  const database = getDatabase(env);
  if (!database) return null;
  return database
    .prepare(
      `SELECT id, encrypted, encryption_version, encryption_metadata
       FROM files
       WHERE id = ?`
    )
    .bind(id)
    .first();
}

function encryptedViewerResponse(id, record) {
  const metadata = parseEncryptionMetadata(record.encryption_metadata);
  if (!metadata || Number(record.encryption_version) !== metadata.version) {
    return new Response('Invalid encryption metadata', { status: 500 });
  }

  return new Response(renderEncryptedViewer(id, metadata), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Content-Security-Policy':
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'none'",
      'X-Robots-Tag': 'noindex',
    },
  });
}

export async function handleView(request, env) {
  const limited = await enforceViewRateLimit(request, env);
  if (limited) return limited;

  const url = new URL(request.url);
  const id = url.pathname.slice('/view/'.length);
  if (!validId(id)) return new Response('Invalid ID', { status: 400 });

  const record = await getFileRecord(env, id);
  if (record && Number(record.encrypted) === 1) {
    return encryptedViewerResponse(id, record);
  }

  const object = await getBucket(env).get(id);
  if (!object) return new Response('Not Found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Content-Security-Policy':
        'sandbox allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox',
      'X-Robots-Tag': 'noindex',
    },
  });
}

export async function handlePublicContent(request, env) {
  const limited = await enforceViewRateLimit(request, env);
  if (limited) return limited;

  const url = new URL(request.url);
  const id = url.pathname.slice('/api/content/'.length);
  if (!validId(id)) return new Response('Invalid ID', { status: 400 });

  const record = await getFileRecord(env, id);
  if (!record || Number(record.encrypted) !== 1) {
    return new Response('Not Found', { status: 404 });
  }

  const object = await getBucket(env).get(id);
  if (!object) return new Response('Not Found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}