import {
  checkRateLimit,
  getBucket,
  getClientIp,
  getDatabase,
} from '../security.js';
import { resolveLang } from '../i18n.js';
import {
  contentTypeFor,
  isSandboxedDocumentType,
  normalizeSitePath,
  siteKey,
} from '../site-storage.js';
import {
  enforceViewRateLimit,
  recordVisit,
  renderExpiredPage,
  renderReportedPage,
} from './view.js';

const ASSET_RATE_PER_HOUR = 3000;

const SANDBOX = 'sandbox allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-downloads';

function notFound() {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

function redirectTo(location) {
  return new Response(null, {
    status: 301,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function responseHeaders(object, path, isEntry) {
  const type = object.httpMetadata?.contentType || contentTypeFor(path);
  const headers = {
    'Content-Type': type,
    'Cache-Control': isEntry ? 'no-cache' : 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
    'Referrer-Policy': 'no-referrer',
    'Access-Control-Allow-Origin': '*',
  };
  if (isSandboxedDocumentType(type)) {
    headers['Content-Security-Policy'] = SANDBOX;
  }
  if (object.httpEtag) headers.ETag = object.httpEtag;
  if (object.uploaded instanceof Date) {
    headers['Last-Modified'] = object.uploaded.toUTCString();
  }
  return headers;
}

export async function handleSite(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' },
    });
  }

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/s\/([a-z0-9-]+)(\/.*)?$/i);
  if (!match) return notFound();
  const id = match[1];

  const database = getDatabase(env);
  const bucket = getBucket(env);
  if (!database || !bucket) return new Response('Service unavailable', { status: 503 });

  const record = await database
    .prepare(
      `SELECT id, kind, entry_path, expires_at, reported_at
       FROM files WHERE id = ?`
    )
    .bind(id)
    .first();
  if (!record || record.kind !== 'site' || !record.entry_path) return notFound();

  const lang = resolveLang(request);

  if (record.reported_at) {
    return new Response(renderReportedPage(lang), {
      status: 451,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store',
      },
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (record.expires_at && record.expires_at > 0 && record.expires_at < now) {
    return new Response(renderExpiredPage(lang), {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store',
      },
    });
  }

  const suffix = match[2] || '';
  if (suffix === '') {
    return redirectTo(`/s/${id}/${url.search}`);
  }

  let raw;
  try {
    raw = decodeURIComponent(suffix.slice(1));
  } catch {
    return notFound();
  }

  const isRoot = raw === '';
  const wantsDirectory = raw.endsWith('/');
  const cleaned = isRoot ? '' : raw.replace(/\/+$/, '');
  const relative = isRoot ? record.entry_path : normalizeSitePath(cleaned);
  if (!isRoot && !relative) return notFound();

  const isEntry = isRoot || relative === record.entry_path;

  const limited = isEntry
    ? await enforceViewRateLimit(request, env)
    : await checkRateLimit(
        env,
        getClientIp(request),
        'site-assets-h',
        ASSET_RATE_PER_HOUR,
        3600
      ).then((result) => (
        result.allowed
          ? null
          : new Response('Too many requests', {
              status: 429,
              headers: { 'Retry-After': String(result.retryAfter) },
            })
      ));
  if (limited) return limited;

  let target = relative || record.entry_path;
  if (wantsDirectory && !isRoot) target = `${relative}/index.html`;

  let object = await bucket.get(siteKey(id, target));
  if (!object && !wantsDirectory) {
    const nested = await bucket.head(siteKey(id, `${relative}/index.html`));
    if (nested) {
      return redirectTo(`${url.pathname}/${url.search}`);
    }
  }
  if (!object) return notFound();

  const headers = responseHeaders(object, target, isEntry);
  const inm = (request.headers.get('If-None-Match') || '').replace(/^W\//, '');
  if (inm && inm === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  if (isEntry && request.method === 'GET') {
    await recordVisit(env, id, request);
  }

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }
  return new Response(object.body, { status: 200, headers });
}
