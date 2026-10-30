import { json, checkRateLimit, generateId, getClientIp } from '../security.js';
import { CONFIG } from '../config.js';
import { validateToken } from './oauth-token.js';
import { bytesToBase64Url, generateEditToken, hashPagePassword, sha256 } from '../crypto.js';
import { contentTypeFor, deleteSiteObjects, normalizeSitePath, siteKey } from '../site-storage.js';
import { queryGallery } from './gallery.js';

const MCP_VERSION = '2026-07-28';
const SERVER_VERSION = '2.3.0';
const SUPPORTED_VERSIONS = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26'];

export const TOOLS = [
  {
    name: 'upload',
    description:
      'Upload one HTML/code payload and get a public share URL plus an edit token. Each call creates a new asset unless idempotencyKey is reused. Anonymous uploads are rate-limited to 10/hour and 50/day per IP; authenticated uploads are limited per account. Content is public unless password-protected and expires after expiresIn (default 7d). Use upload_site for multi-file sites, view to read back, list_assets for your own files, or delete to remove one.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'HTML or code to publish (required, max 500 KB).' },
        language: {
          type: 'string',
          description: 'Content language hint, e.g. html, css, js, json, markdown. Default html.',
          default: 'html',
        },
        filename: {
          type: 'string',
          description: 'Optional display filename used in the title and download name (max 200 chars).',
        },
        title: { type: 'string', description: 'Optional title shown in the viewer and gallery metadata.' },
        description: { type: 'string', description: 'Optional description for the asset.' },
        tags: { type: 'string', description: 'Optional comma-separated tags.' },
        password: {
          type: 'string',
          description: 'Optional password; the web view asks for it before showing content.',
        },
        expiresIn: {
          type: 'string',
          description: 'Retention: 1h, 24h, 7d, 30d, 90d, or 0 for permanent. Default 7d.',
          default: '7d',
        },
        idempotencyKey: {
          type: 'string',
          description: 'Optional 1-128 char retry key. Reusing it with the same payload returns the original asset; the edit token is only returned to the original caller.',
        },
      },
      required: ['content'],
    },
    annotations: {
      title: 'Upload Content',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
  },
  {
    name: 'upload_site',
    description:
      'Publish a multi-file static site from an authenticated account. Pass files as an array of {path, content} strings; the root must contain index.html or index.htm. Returns a /s/<id>/ URL that serves HTML/CSS/JS/assets. Limits: 200 files, 20 MB total, 5 MB per file. Requires OAuth or an API key; site links never show the anonymous badge. Use idempotencyKey to make retries safe.',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'Site files. Paths are relative and must not contain .. or absolute paths.',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path, e.g. index.html or assets/app.css.' },
              content: { type: 'string', description: 'UTF-8 file content.' },
            },
            required: ['path', 'content'],
          },
          minItems: 1,
          maxItems: 200,
        },
        title: { type: 'string', description: 'Optional site title; defaults to "site".' },
        description: { type: 'string', description: 'Optional description.' },
        tags: { type: 'string', description: 'Optional comma-separated tags.' },
        expiresIn: {
          type: 'string',
          description: 'Retention: 1h, 24h, 7d, 30d, 90d, or 0 for permanent. Default 7d.',
          default: '7d',
        },
        idempotencyKey: {
          type: 'string',
          description: 'Optional 1-128 char retry key. Reusing it with the same payload returns the original site; the edit token is only returned to the original caller.',
        },
      },
      required: ['files'],
    },
    annotations: {
      title: 'Upload Static Site',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
  },
  {
    name: 'list_assets',
    description:
      'List up to 50 assets owned by the authenticated user, newest first, with id, filename, timestamps and share URL. Requires an API key or signed-in session; read-only, and results are capped at 50 with no pagination. Use search_gallery for public works from other users, or view to open one of your assets.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: {
      title: 'List Assets',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  {
    name: 'view',
    description:
      'Fetch a single asset by id and return its content, filename, creation time and share URL. Read-only and safe to retry; public assets need no auth, password-protected assets return an error with the share URL, and client-encrypted content is returned as stored. Use search_gallery to find an id, or list_assets for your own uploads.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '12-character asset id returned by upload or search_gallery.' },
      },
      required: ['id'],
    },
    annotations: {
      title: 'View Content',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  {
    name: 'delete',
    description:
      'Permanently delete one of your own assets by id. Irreversible: the share URL stops working immediately and the content cannot be restored. Requires authentication and ownership; ids you do not own return an error. Use list_assets to find the id; there is no bulk delete.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '12-character asset id you own (from list_assets).' },
      },
      required: ['id'],
    },
    annotations: {
      title: 'Delete Asset',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
    },
  },
  {
    name: 'get_info',
    description:
      'Return Oh My Share service metadata: version, REST and MCP endpoints, feature list, and per-IP rate limits (10 uploads/hour, 500 views/hour). Read-only, no auth, cheap to call. Use it once at startup to discover capabilities; use list_assets or search_gallery for actual content.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: {
      title: 'Service Info',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  {
    name: 'search_gallery',
    description:
      'Search public gallery works by keyword across title, description, tags and id; omit query to browse the newest works. Returns a paginated result set (items, total, page, pages) where each item has id, title, views and URLs. sort is new (newest) or hot (most liked and viewed); limit is capped at 20. No auth required. Use view to open a result, or list_assets for your own uploads.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword matched against title, description, tags and id; empty returns the newest works.',
        },
        sort: {
          type: 'string',
          enum: ['new', 'hot'],
          default: 'new',
          description: 'new = newest first; hot = most liked and viewed.',
        },
        page: { type: 'integer', minimum: 1, default: 1, description: '1-based page number. Default 1.' },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          default: 10,
          description: 'Results per page, 1 to 20. Default 10.',
        },
      },
    },
    annotations: {
      title: 'Search Gallery',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
];

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

async function getAuthContext(request, env) {
  const auth = request.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) {
    const userId = await validateToken(request, env);
    if (userId) return { userId, source: 'token' };
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  if (cookies.osh_session) {
    const tokenHash = bytesToBase64Url(await sha256(cookies.osh_session));
    const user = await env.DB.prepare(
      `SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > strftime('%s','now')`
    ).bind(tokenHash).first();
    if (user) return { userId: user.user_id, source: 'cookie' };
  }

  return null;
}

// MCP exposes human-friendly TTLs ("1h", "7d"); the REST API uses seconds.
const EXPIRY_TTL = { '1h': 3600, '24h': 86400, '7d': 604800, '30d': 2592000, '90d': 7776000 };

function parseExpiresIn(value) {
  if (value === undefined || value === null || value === '') return 604800;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  const key = String(value).trim().toLowerCase();
  if (key === '0' || key === 'permanent' || key === 'never') return 0;
  if (EXPIRY_TTL[key]) return EXPIRY_TTL[key];
  const seconds = parseInt(key, 10);
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 604800;
}

function errorResult(code, message, extra = {}) {
  return { error: message, code, ...extra };
}

function cleanText(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

async function checkUploadQuota(env, auth, ip) {
  const identity = auth ? `user:${auth.userId}` : `ip:${ip || 'unknown'}`;
  const hour = await checkRateLimit(env, identity, 'upload-h', CONFIG.RATE_UPLOAD_PER_HOUR, 3600);
  if (!hour.allowed) {
    return errorResult(
      'rate_limited',
      `Hourly upload limit reached (${CONFIG.RATE_UPLOAD_PER_HOUR}/hour). Retry in ${hour.retryAfter}s.`,
      { retryAfter: hour.retryAfter }
    );
  }
  const day = await checkRateLimit(env, identity, 'upload-d', CONFIG.RATE_UPLOAD_PER_DAY, 86400);
  if (!day.allowed) {
    return errorResult(
      'rate_limited',
      `Daily upload limit reached (${CONFIG.RATE_UPLOAD_PER_DAY}/day). Retry in ${day.retryAfter}s.`,
      { retryAfter: day.retryAfter }
    );
  }
  const global = await checkRateLimit(env, 'global', 'upload-global-d', CONFIG.GLOBAL_DAILY_UPLOAD_CAP, 86400);
  if (!global.allowed) {
    return errorResult(
      'capacity_reached',
      'Daily upload capacity reached. Try again later.',
      { retryAfter: global.retryAfter }
    );
  }
  return null;
}

async function idempotencyKeyFor(request, auth, raw, scope, payloadDigest) {
  if (raw === undefined || raw === null || raw === '') return null;
  const value = String(raw);
  if (value.length > 128) return errorResult('invalid_idempotency_key', 'idempotencyKey must be 128 characters or fewer.');
  // Anonymous clients can change IP between retries (IPv4/IPv6, mobile networks).
  // Scope retries by the payload as well, so a retry of the same request is safe
  // without letting a guessed key address someone else's unrelated upload.
  const identity = auth ? `user:${auth.userId}` : 'anonymous';
  const digest = bytesToBase64Url(await sha256(`${scope}:${identity}:${payloadDigest || ''}:${value}`));
  return digest;
}

async function idempotencyScopeFor(request, auth) {
  const identity = auth ? `user:${auth.userId}` : `ip:${getClientIp(request)}`;
  return bytesToBase64Url(await sha256(`idempotency-scope:${identity}`));
}

async function existingIdempotentUpload(env, key) {
  if (!key) return null;
  return env.DB.prepare(
    `SELECT id, kind, edit_token, expires_at, title, owner_id, idempotency_scope
     FROM files WHERE idempotency_key = ?`
  ).bind(key).first();
}

function idempotentResult(origin, existing, scope) {
  const sameScope = Boolean(existing.idempotency_scope) && existing.idempotency_scope === scope;
  const isSite = existing.kind === 'site';
  const result = {
    id: existing.id,
    url: uploadUrl(origin, existing),
    expiresAt: existing.expires_at || null,
    reused: true,
    badge: !existing.owner_id,
  };
  if (isSite) result.kind = 'site';
  if (sameScope) {
    result.editToken = existing.edit_token;
    if (!isSite) result.editUrl = `${origin}/edit/${existing.id}?token=${existing.edit_token}`;
  } else {
    result.note = 'Reused by idempotencyKey; the edit token is only returned to the original caller.';
  }
  return result;
}

function uploadUrl(origin, row) {
  return row.kind === 'site'
    ? `${origin}/s/${row.id}/`
    : `${origin}/view/${row.id}`;
}

async function logMcpCall(env, tool, status, auth, request, durationMs) {
  if (!env.DB) return;
  const client = cleanText(request.headers.get('User-Agent') || '', 200) || null;
  const authSource = auth ? auth.source : 'anonymous';
  await env.DB.prepare(
    `INSERT INTO mcp_calls (tool, status, auth_source, client, duration_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(tool, status, authSource, client, durationMs, Math.floor(Date.now() / 1000)).run().catch(() => {});
}

async function handleToolCall(name, args, env, auth, ip, request, origin) {
  switch (name) {
    case 'upload': {
      const { content, language = 'html', filename, title, description, tags, password, expiresIn = '7d', idempotencyKey } = args;
      if (typeof content !== 'string' || !content) {
        return errorResult('invalid_content', 'content is required and must be a string.');
      }

      const contentBytes = new TextEncoder().encode(content).byteLength;
      if (contentBytes > CONFIG.MAX_CODE_SIZE) {
        return errorResult('payload_too_large', `content exceeds the 500 KB limit (${contentBytes} bytes).`);
      }
      if (password && String(password).length > CONFIG.PAGE_PASSWORD_MAX_LENGTH) {
        return errorResult('password_too_long', 'password must be 128 characters or fewer.');
      }

      let idemKey, idemScope;
      try {
        const payloadDigest = bytesToBase64Url(await sha256(content));
        idemKey = await idempotencyKeyFor(request, auth, idempotencyKey, 'upload', payloadDigest);
        idemScope = idemKey ? await idempotencyScopeFor(request, auth) : null;
      } catch (error) {
        return errorResult('invalid_idempotency_key', error.message);
      }
      if (idemKey && idemKey.error) return idemKey;

      const existing = await existingIdempotentUpload(env, idemKey);
      if (existing) return idempotentResult(origin, existing, idemScope);

      const quota = await checkUploadQuota(env, auth, ip);
      if (quota) return quota;

      const id = generateId();
      const editToken = generateEditToken();
      const ownerId = auth ? auth.userId : null;
      const createdAt = Math.floor(Date.now() / 1000);
      const ttl = parseExpiresIn(expiresIn);
      const expiresAt = ttl > 0 ? createdAt + ttl : null;
      const cleanFilename = cleanText(filename, 200) || null;
      const cleanTitle = cleanText(title, 200);
      const cleanDescription = cleanText(description, 1000);
      const cleanTags = cleanText(tags, 500);
      const passwordHash = password ? await hashPagePassword(String(password)) : null;

      try {
        await env.MY_BUCKET.put(id, content, {
          httpMetadata: { contentType: 'text/html' },
        });

        await env.DB.prepare(
          `INSERT INTO files
           (id, filename, owner_id, title, description, tags, created_at, edit_token,
            updated_at, expires_at, password_hash, source, user_agent, idempotency_key,
            idempotency_scope)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'mcp', ?, ?, ?)`
        ).bind(
          id,
          cleanFilename,
          ownerId,
          cleanTitle,
          cleanDescription,
          cleanTags,
          createdAt,
          editToken,
          createdAt,
          expiresAt,
          passwordHash,
          cleanText(request.headers.get('User-Agent') || '', 200) || null,
          idemKey,
          idemScope
        ).run();
      } catch (error) {
        if (idemKey) {
          const raced = await existingIdempotentUpload(env, idemKey);
          if (raced) {
            await env.MY_BUCKET.delete(id).catch(() => {});
            return idempotentResult(origin, raced, idemScope);
          }
        }
        console.error('MCP upload failed:', error);
        await env.MY_BUCKET.delete(id).catch(() => {});
        return errorResult('storage_error', 'Upload failed while storing the asset.');
      }

      return {
        id,
        url: `${origin}/view/${id}`,
        editUrl: `${origin}/edit/${id}?token=${editToken}`,
        editToken,
        language,
        filename: cleanFilename,
        title: cleanTitle || null,
        expiresAt,
        badge: !auth,
        reused: false,
      };
    }

    case 'upload_site': {
      if (!auth) return errorResult('auth_required', 'Sign in to upload a site.');
      const { files, title, description, tags, expiresIn = '7d', idempotencyKey } = args;
      if (!Array.isArray(files) || files.length === 0) {
        return errorResult('invalid_files', 'files must be a non-empty array of {path, content}.');
      }
      if (files.length > CONFIG.SITE_MAX_FILES) {
        return errorResult('too_many_files', `A site can contain at most ${CONFIG.SITE_MAX_FILES} files.`);
      }

      const accepted = [];
      const seen = new Set();
      let totalSize = 0;
      for (const file of files) {
        if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
          return errorResult('invalid_files', 'Each file needs string path and content fields.');
        }
        const path = normalizeSitePath(file.path);
        if (!path) return errorResult('invalid_path', `Unsupported path: ${file.path}`);
        if (seen.has(path)) return errorResult('duplicate_path', `Duplicate path: ${path}`);
        seen.add(path);
        const bytes = new TextEncoder().encode(file.content).byteLength;
        if (bytes > CONFIG.SITE_MAX_FILE_BYTES) {
          return errorResult('file_too_large', `${path} exceeds the 5 MB per-file limit.`);
        }
        totalSize += bytes;
        accepted.push({ path, content: file.content });
      }
      if (totalSize > CONFIG.SITE_MAX_BYTES) {
        return errorResult('site_too_large', 'The site exceeds the 20 MB total limit.');
      }

      const roots = new Set(accepted.map((file) => file.path.split('/')[0]));
      const allNested = accepted.every((file) => file.path.includes('/'));
      if (allNested && roots.size === 1) {
        const root = [...roots][0];
        for (const file of accepted) file.path = file.path.slice(root.length + 1);
      }

      const entry = accepted.find((file) => file.path.toLowerCase() === 'index.html')
        || accepted.find((file) => file.path.toLowerCase() === 'index.htm');
      if (!entry) {
        return errorResult('missing_index', 'The site root must contain index.html or index.htm.');
      }

      let idemKey, idemScope;
      try {
        const canonicalFiles = [...accepted].sort((a, b) => a.path.localeCompare(b.path));
        const payloadDigest = bytesToBase64Url(await sha256(JSON.stringify(canonicalFiles)));
        idemKey = await idempotencyKeyFor(request, auth, idempotencyKey, 'upload-site', payloadDigest);
        idemScope = idemKey ? await idempotencyScopeFor(request, auth) : null;
      } catch (error) {
        return errorResult('invalid_idempotency_key', error.message);
      }
      if (idemKey && idemKey.error) return idemKey;

      const existing = await existingIdempotentUpload(env, idemKey);
      if (existing) return idempotentResult(origin, existing, idemScope);

      const quota = await checkUploadQuota(env, auth, ip);
      if (quota) return quota;

      const id = generateId();
      const editToken = generateEditToken();
      const now = Math.floor(Date.now() / 1000);
      const ttl = parseExpiresIn(expiresIn);
      const expiresAt = ttl > 0 ? now + ttl : null;
      const siteTitle = cleanText(title, 200) || 'site';
      const cleanDescription = cleanText(description, 1000);
      const cleanTags = cleanText(tags, 500);

      try {
        for (const file of accepted) {
          await env.MY_BUCKET.put(siteKey(id, file.path), file.content, {
            httpMetadata: { contentType: contentTypeFor(file.path) },
          });
        }
        await env.DB.prepare(
          `INSERT INTO files
           (id, filename, created_at, owner_id, encrypted, title, description, tags,
            edit_token, expires_at, updated_at, published_at, kind, entry_path,
            file_count, total_size, source, user_agent, idempotency_key, idempotency_scope)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, 'site', ?, ?, ?, 'mcp', ?, ?, ?)`
        ).bind(
          id,
          `${siteTitle}/`,
          now,
          auth.userId,
          siteTitle,
          cleanDescription,
          cleanTags,
          editToken,
          expiresAt,
          now,
          entry.path,
          accepted.length,
          totalSize,
          cleanText(request.headers.get('User-Agent') || '', 200) || null,
          idemKey,
          idemScope
        ).run();
      } catch (error) {
        if (idemKey) {
          const raced = await existingIdempotentUpload(env, idemKey);
          if (raced) {
            await deleteSiteObjects(env.MY_BUCKET, id).catch(() => {});
            return idempotentResult(origin, raced, idemScope);
          }
        }
        console.error('MCP site upload failed:', error);
        await deleteSiteObjects(env.MY_BUCKET, id).catch(() => {});
        return errorResult('storage_error', 'Site upload failed while storing files.');
      }

      return {
        id,
        kind: 'site',
        url: `${origin}/s/${id}/`,
        editToken,
        title: siteTitle,
        files: accepted.length,
        size: totalSize,
        expiresAt,
        badge: false,
        reused: false,
      };
    }

    case 'list_assets': {
      if (!auth) return { error: 'Authentication required. Use Bearer token or login first.' };

      const { results } = await env.DB.prepare(
        `SELECT id, kind, filename, title, tags, created_at, updated_at, expires_at, published_at, password_hash
         FROM files WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50`
      ).bind(auth.userId).all();

      return {
        assets: results.map(r => ({
          id: r.id,
          kind: r.kind || 'file',
          filename: r.filename,
          title: r.title || null,
          tags: String(r.tags || '').split(',').map(t => t.trim()).filter(Boolean),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          expiresAt: r.expires_at || null,
          published: Boolean(r.published_at),
          passwordProtected: Boolean(r.password_hash),
          url: r.kind === 'site'
            ? `${origin}/s/${r.id}/`
            : `${origin}/view/${r.id}`,
        })),
        total: results.length,
      };
    }

    case 'view': {
      const { id } = args;
      if (!id) return { error: 'id is required' };

      const row = await env.DB.prepare(
        `SELECT id, kind, filename, created_at, password_hash FROM files WHERE id = ?`
      ).bind(id).first();

      if (!row) return { error: 'Content not found' };

      if (row.kind === 'site') {
        return {
          id: row.id,
          kind: 'site',
          filename: row.filename,
          createdAt: row.created_at,
          url: `${origin}/s/${row.id}/`,
          note: 'Folder share. Open the URL to browse its files.',
        };
      }

      // Password protection must be enforced here too: the web view asks for
      // the password, and the API used to return the content regardless.
      if (row.password_hash) {
        return {
          error: 'This asset is password-protected. Open the share URL in a browser to unlock it.',
          id: row.id,
          url: `${origin}/view/${row.id}`,
        };
      }

      // Read content from R2
      const object = await env.MY_BUCKET.get(id);
      const content = object ? await object.text() : null;

      return {
        id: row.id,
        content,
        filename: row.filename,
        createdAt: row.created_at,
        url: `${origin}/view/${row.id}`,
      };
    }

    case 'delete': {
      if (!auth) return { error: 'Authentication required' };

      const { id } = args;
      if (!id) return { error: 'id is required' };

      const row = await env.DB.prepare(
        `SELECT kind FROM files WHERE id = ? AND owner_id = ?`
      ).bind(id, auth.userId).first();
      if (!row) return { error: 'Asset not found or not authorized' };

      if (env.MY_BUCKET) {
        if (row.kind === 'site') await deleteSiteObjects(env.MY_BUCKET, id);
        else await env.MY_BUCKET.delete(id);
      }
      await env.DB.prepare(
        `DELETE FROM files WHERE id = ? AND owner_id = ?`
      ).bind(id, auth.userId).run();

      return { success: true, message: `Asset ${id} deleted` };
    }

    case 'search_gallery': {
      const data = await queryGallery(env, {
        q: args.query,
        sort: args.sort,
        page: args.page,
        perPage: args.limit,
      });
      return {
        total: data.total,
        page: data.page,
        pages: data.pages,
        sort: data.sort,
        items: data.items.map((item) => ({
          id: item.id,
          title: item.title || item.filename || item.id,
          description: item.description || '',
          tags: String(item.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
          views: item.views,
          url: `${origin}/view/${item.id}`,
          detailUrl: `${origin}/gallery/${item.id}`,
          remixUrl: `${origin}/remix/${item.id}`,
        })),
      };
    }
    case 'get_info': {
      return {
        name: 'Oh My Share',
        description: 'Publish HTML, code, or multi-file static sites from your agent and get a shareable link.',
        version: SERVER_VERSION,
        url: 'https://openanthropic.com',
        endpoints: {
          upload: 'POST /api/upload',
          site: 'GET /s/{id}/',
          assets: 'GET /api/assets',
          view: 'GET /view/{id}',
          auth: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          mcp: 'POST /mcp',
          oauth: 'POST /oauth/token',
        },
        tools: ['upload', 'upload_site', 'view', 'list_assets', 'delete', 'search_gallery', 'get_info'],
        features: [
          'multi-file static sites',
          'retry-safe idempotencyKey',
          'password protection',
          'expiration',
          'edit tokens',
          'encrypted sharing',
          'OAuth and API keys',
        ],
        limits: {
          singleContentBytes: CONFIG.MAX_CODE_SIZE,
          siteFiles: CONFIG.SITE_MAX_FILES,
          siteTotalBytes: CONFIG.SITE_MAX_BYTES,
          siteFileBytes: CONFIG.SITE_MAX_FILE_BYTES,
          passwordChars: CONFIG.PAGE_PASSWORD_MAX_LENGTH,
        },
        defaults: {
          mcpExpiry: '7d',
          anonymousBadge: true,
          authenticatedBadge: false,
        },
        rateLimits: {
          upload: `${CONFIG.RATE_UPLOAD_PER_HOUR}/hour, ${CONFIG.RATE_UPLOAD_PER_DAY}/day per IP or account`,
          view: `${CONFIG.RATE_VIEW_PER_HOUR}/hour per IP`,
          dailyGlobalUploadCap: CONFIG.GLOBAL_DAILY_UPLOAD_CAP,
        },
        sourceTracking: 'New uploads record source (mcp/api/web/a2a) and a truncated user agent.',
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function handleMcp(request, env) {
  const origin = new URL(request.url).origin;

  if (request.method === 'GET') {
    // Spec: a GET that asks for text/event-stream must either open an SSE
    // stream or get 405 — we never push server-initiated messages, so we tell
    // clients we have no stream instead of answering with unrelated JSON.
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/event-stream')) {
      return new Response('This server does not offer an SSE stream; use POST for JSON-RPC.', {
        status: 405,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    return new Response(JSON.stringify({
      name: 'oh-my-share',
      version: SERVER_VERSION,
      protocolVersion: MCP_VERSION,
      capabilities: {
        tools: { listChanged: false },
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await getAuthContext(request, env);

  let body;
  try {
    const contentType = request.headers.get('content-type') || '';
    const text = await request.text();

    if (contentType.includes('application/json')) {
      body = JSON.parse(text);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      body = Object.fromEntries(new URLSearchParams(text));
      if (typeof body.params === 'string') {
        try { body.params = JSON.parse(body.params); } catch {}
      }
      if (typeof body.id === 'string' && /^\d+$/.test(body.id)) {
        body.id = parseInt(body.id);
      }
    } else {
      body = JSON.parse(text);
    }
  } catch {
    return json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }, 400);
  }

  const { id, method, params } = body;

  // Handle server/discover for new protocol versions
  if (method === 'server/discover') {
    return json({
      jsonrpc: '2.0',
      result: {
        name: 'oh-my-share',
        description: 'Publish HTML/code from your agent and get a shareable link.',
        version: SERVER_VERSION,
        protocolVersions: SUPPORTED_VERSIONS,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
        },
      },
      id,
    });
  }

  if (method === 'initialize') {
    const origin = new URL(request.url).origin;
    const requestedVersion = params?.protocolVersion || MCP_VERSION;

    // Check if we support the requested version
    if (!SUPPORTED_VERSIONS.includes(requestedVersion)) {
      return json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'UnsupportedProtocolVersion',
          data: { supported: SUPPORTED_VERSIONS },
        },
        id,
      });
    }

    return json({
      jsonrpc: '2.0',
      result: {
        protocolVersion: requestedVersion,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: 'oh-my-share',
          description: 'Publish HTML/code from your agent and get a shareable link.',
          version: SERVER_VERSION,
        },
        instructions:
          'Publish one HTML/code payload with upload, or a multi-file static site with upload_site (auth required). Both return an id, share URL and editToken; pass an idempotencyKey so retries after a timeout return the original asset instead of duplicating it. Anonymous single-file uploads are allowed (10/hour, 50/day, 7d default expiry, badge on the link); authenticated uploads are badge-free and can use upload_site (200 files, 20 MB total). Use view to read an asset back, list_assets for your own uploads, search_gallery for public works, and delete to remove one. Call get_info for limits and capabilities.',
        authentication: {
          type: 'oauth2',
          apiKey: {
            // Static bearer tokens (issued from the CORS proxy page) also work,
            // for non-interactive clients that cannot run a browser OAuth flow.
            header: 'Authorization',
            prefix: 'Bearer',
            instructions: 'Create an account, then get a key from /corsproxy (Authorization: Bearer ck_...)',
          },
          oauth2: {
            authorizationEndpoint: `${origin}/oauth/authorize`,
            tokenEndpoint: `${origin}/oauth/token`,
            registrationEndpoint: `${origin}/api/auth/register`,
            grantTypes: ['authorization_code', 'password'],
            scopes: ['upload', 'manage', 'read'],
            codeChallengeMethods: ['S256'],
          },
        },
      },
      id,
    });
  }

  if (method === 'notifications/initialized') {
    // Spec: accepted notifications answer 202 with no body.
    return new Response(null, { status: 202 });
  }

  if (method === 'tools/list') {
    return json({
      jsonrpc: '2.0',
      result: { tools: TOOLS },
      id,
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};

    // Check if tool requires authentication
    const requiresAuth = ['list_assets', 'delete', 'upload_site'].includes(name);
    if (requiresAuth && !auth) {
      const origin = new URL(request.url).origin;
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Authentication required',
          data: {
            resource_metadata: `${origin}/.well-known/oauth-protected-resource`,
          },
        },
        id,
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
        },
      });
    }

    const startedAt = Date.now();
    let result;
    try {
      result = await handleToolCall(name, args || {}, env, auth, getClientIp(request), request, origin);
    } catch (error) {
      console.error('MCP tool call failed:', error);
      result = errorResult('internal_error', 'The tool call failed unexpectedly. Retry once, then report the issue.');
    }
    const isError = Boolean(result && result.error);
    await logMcpCall(env, name || 'unknown', isError ? 'error' : 'ok', auth, request, Date.now() - startedAt);

    return json({
      jsonrpc: '2.0',
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
        isError,
      },
      id,
    });
  }

  if (method === 'ping') {
    return json({ jsonrpc: '2.0', result: {}, id });
  }

  // We advertise the prompts/resources capabilities, so clients legitimately
  // probe their list methods right after initialize. Serve empty collections
  // instead of failing — an unimplemented advertised method breaks the client.
  if (method === 'prompts/list') {
    return json({ jsonrpc: '2.0', result: { prompts: [] }, id });
  }

  if (method === 'resources/list') {
    return json({ jsonrpc: '2.0', result: { resources: [] }, id });
  }

  if (method === 'resources/templates/list') {
    return json({ jsonrpc: '2.0', result: { resourceTemplates: [] }, id });
  }

  // No resources to subscribe to, but clients may still call these.
  if (method === 'resources/subscribe' || method === 'resources/unsubscribe') {
    return json({ jsonrpc: '2.0', result: {}, id });
  }

  if (method === 'prompts/get') {
    return json({
      jsonrpc: '2.0',
      error: { code: -32602, message: `Unknown prompt: ${params?.name ?? ''}`.trim() },
      id,
    });
  }

  if (method === 'resources/read') {
    return json({
      jsonrpc: '2.0',
      error: { code: -32602, message: `Unknown resource: ${params?.uri ?? ''}`.trim() },
      id,
    });
  }

  // Unhandled notifications: accept and ignore (202, no body).
  if (id === undefined || id === null) {
    return new Response(null, { status: 202 });
  }

  // JSON-RPC errors must travel with HTTP 200. A 4xx makes clients report a
  // transport failure, and 404 specifically means "session terminated" in the
  // Streamable HTTP spec — both break otherwise-valid sessions.
  return json({
    jsonrpc: '2.0',
    error: { code: -32601, message: `Method not found: ${method}` },
    id,
  });
}
