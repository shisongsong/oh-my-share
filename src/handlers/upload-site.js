import { CONFIG } from '../config.js';
import { generateEditToken } from '../crypto.js';
import { getCurrentUser, isSameOriginRequest } from '../auth.js';
import {
  checkRateLimit,
  generateId,
  getBucket,
  getClientIp,
  getDatabase,
  json,
} from '../security.js';
import {
  contentTypeFor,
  deleteSiteObjects,
  isIgnoredSiteFile,
  normalizeSitePath,
  siteKey,
} from '../site-storage.js';

function rateLimitResponse(code, message, retryAfter = 0) {
  return json(
    { error: message, code },
    429,
    retryAfter ? { 'Retry-After': String(retryAfter) } : {}
  );
}

function fileEntries(formData) {
  const out = [];
  for (const [name, value] of formData.entries()) {
    if (name !== 'files') continue;
    if (!value || typeof value !== 'object') continue;
    if (typeof value.name !== 'string' || typeof value.arrayBuffer !== 'function') continue;
    out.push(value);
  }
  return out;
}

export async function handleSiteUpload(request, env) {
  if (!isSameOriginRequest(request)) {
    return json({ error: 'Invalid origin', code: 'errForbidden' }, 403);
  }

  const user = await getCurrentUser(request, env);
  if (!user) {
    return json(
      { error: 'Sign in to upload a folder', code: 'errSiteAuth' },
      401,
      { 'Cache-Control': 'no-store' }
    );
  }

  const ip = getClientIp(request);
  const hourLimit = await checkRateLimit(
    env,
    ip,
    'upload-h',
    CONFIG.RATE_UPLOAD_PER_HOUR,
    3600
  );
  if (!hourLimit.allowed) {
    return rateLimitResponse(
      'errRateLimited',
      `Rate limit exceeded. Retry in ${hourLimit.retryAfter}s`,
      hourLimit.retryAfter
    );
  }

  const dayLimit = await checkRateLimit(
    env,
    ip,
    'upload-d',
    CONFIG.RATE_UPLOAD_PER_DAY,
    86400
  );
  if (!dayLimit.allowed) {
    return rateLimitResponse('errRateLimited', 'Daily limit exceeded', dayLimit.retryAfter);
  }

  const globalLimit = await checkRateLimit(
    env,
    'global',
    'upload-global-d',
    CONFIG.GLOBAL_DAILY_UPLOAD_CAP,
    86400
  );
  if (!globalLimit.allowed) {
    return rateLimitResponse('errCapacity', 'Daily upload capacity reached', globalLimit.retryAfter);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Invalid form data', code: 'errSiteInvalid' }, 400);
  }

  const rawFiles = fileEntries(form);
  if (!rawFiles.length) {
    return json({ error: 'No files in this folder', code: 'errSiteEmpty' }, 400);
  }

  const accepted = [];
  const seen = new Set();
  let totalSize = 0;

  for (const file of rawFiles) {
    const rawPath = String(file.name || '');
    if (isIgnoredSiteFile(rawPath)) continue;
    const path = normalizeSitePath(rawPath);
    if (!path) {
      return json({ error: 'Invalid file path in folder', code: 'errSiteInvalidPath' }, 400);
    }
    if (seen.has(path)) {
      return json({ error: 'Duplicate file path in folder', code: 'errSiteInvalidPath' }, 400);
    }
    seen.add(path);

    if (Number(file.size) > CONFIG.SITE_MAX_FILE_BYTES) {
      return json(
        {
          error: `File ${path} exceeds the 5MB per-file limit`,
          code: 'errSiteFileTooLarge',
        },
        413
      );
    }

    totalSize += Number(file.size) || 0;
    accepted.push({ path, file, size: Number(file.size) || 0 });
  }

  if (!accepted.length) {
    return json({ error: 'No usable files in this folder', code: 'errSiteEmpty' }, 400);
  }

  // webkitRelativePath always starts with the selected folder name. Strip that
  // single common root so the site is served from /s/<id>/ like a real root.
  const roots = new Set(accepted.map((item) => item.path.split('/')[0]));
  const allNested = accepted.every((item) => item.path.includes('/'));
  let rootName = null;
  if (allNested) {
    if (roots.size !== 1) {
      return json({ error: 'Select a single folder', code: 'errSiteInvalidPath' }, 400);
    }
    rootName = [...roots][0];
    for (const item of accepted) {
      item.path = item.path.slice(rootName.length + 1);
    }
  }

  if (accepted.length > CONFIG.SITE_MAX_FILES) {
    return json(
      { error: `Folder exceeds ${CONFIG.SITE_MAX_FILES} files`, code: 'errSiteTooMany' },
      400
    );
  }
  if (totalSize > CONFIG.SITE_MAX_BYTES) {
    return json({ error: 'Folder exceeds the 20MB limit', code: 'errSiteTooLarge' }, 413);
  }

  const entry = accepted.find((item) => item.path.toLowerCase() === 'index.html')
    || accepted.find((item) => item.path.toLowerCase() === 'index.htm');
  if (!entry) {
    return json(
      { error: 'The folder root must contain index.html', code: 'errSiteNoIndex' },
      400
    );
  }

  const folderName = (rootName || form.get('folder') || accepted[0].path.split('/')[0] || 'site')
    .toString()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 120) || 'site';
  const title = (form.get('title') || folderName).toString().trim().slice(0, 200);
  const description = (form.get('description') || '').toString().slice(0, 1000);
  const tags = (form.get('tags') || '').toString().slice(0, 500);
  const expiresIn = Number.parseInt(form.get('expiresIn') || '0', 10);

  const database = getDatabase(env);
  const bucket = getBucket(env);
  if (!database || !bucket) {
    return json({ error: 'Storage unavailable', code: 'errService' }, 503);
  }

  const id = generateId();
  const editToken = generateEditToken();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0 ? now + expiresIn : 0;

  try {
    for (const item of accepted) {
      const body = await item.file.arrayBuffer();
      await bucket.put(siteKey(id, item.path), body, {
        httpMetadata: { contentType: contentTypeFor(item.path) },
      });
    }

    await database
      .prepare(
        `INSERT INTO files (
           id, filename, created_at, owner_id, encrypted, title, description, tags,
           edit_token, expires_at, updated_at, published_at, kind, entry_path, file_count, total_size,
           source, user_agent
         ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, 'site', ?, ?, ?, 'web', ?)`
      )
      .bind(
        id,
        `${folderName}/`,
        now,
        user.id,
        title,
        description,
        tags,
        editToken,
        expiresAt,
        now,
        entry.path,
        accepted.length,
        totalSize,
        (request.headers.get('User-Agent') || '').slice(0, 200) || null
      )
      .run();
  } catch (error) {
    console.error('Site upload failed:', error);
    try {
      await deleteSiteObjects(bucket, id);
    } catch {
      // Best-effort cleanup only.
    }
    return json({ error: 'Upload failed', code: 'errSiteUploadFailed' }, 503);
  }

  return json(
    {
      id,
      url: `${new URL(request.url).origin}/s/${id}/`,
      editToken,
      expiresAt,
      files: accepted.length,
      size: totalSize,
    },
    200,
    { 'Cache-Control': 'no-store' }
  );
}
