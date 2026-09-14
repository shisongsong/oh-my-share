import { CONFIG } from '../config.js';
import { getCurrentUser } from '../auth.js';
import { hasPaidEntitlement } from '../entitlements.js';
import { parseEncryptionMetadata } from '../encryption.js';
import {
  checkRateLimit,
  generateId,
  getDatabase,
  getBucket,
  getClientIp,
  json,
  validateSlug,
} from '../security.js';

function rateLimitResponse(message, retryAfter = 0) {
  return json(
    { error: message },
    429,
    retryAfter ? { 'Retry-After': String(retryAfter) } : {}
  );
}

export async function handleUpload(request, env) {
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
    return rateLimitResponse('Daily limit exceeded', dayLimit.retryAfter);
  }

  const globalLimit = await checkRateLimit(
    env,
    'global',
    'upload-global-d',
    CONFIG.GLOBAL_DAILY_UPLOAD_CAP,
    86400
  );
  if (!globalLimit.allowed) {
    return rateLimitResponse('Daily upload capacity reached', globalLimit.retryAfter);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'Invalid form data' }, 400);
  }

  const file = formData.get('file');
  const code = formData.get('code');
  const customSlug = formData.get('slug');
  const encryptionRequested = formData.get('encrypted') === '1';
  const title = (formData.get('title') || '').toString().slice(0, 200);
  const description = (formData.get('description') || '').toString().slice(0, 1000);
  const tags = (formData.get('tags') || '').toString().slice(0, 500);

  let currentUser = null;
  let encryptionMetadata = null;
  if (encryptionRequested) {
    currentUser = await getCurrentUser(request, env);
    if (!currentUser) return json({ error: 'Authentication required' }, 401);

    const canEncrypt = await hasPaidEntitlement(env, currentUser.id);
    if (!canEncrypt) return json({ error: 'Paid plan required for encryption' }, 403);

    encryptionMetadata = parseEncryptionMetadata(
      formData.get('encryption_metadata') || formData.get('encryptionMetadata')
    );
    if (!encryptionMetadata) return json({ error: 'Invalid encryption metadata' }, 400);
  } else {
    currentUser = await getCurrentUser(request, env);
  }

  let fileContent;
  let filename;

  if (encryptionRequested && code !== null) {
    return json({ error: 'Encrypted uploads must provide a file payload' }, 400);
  }

  if (code !== null) {
    if (typeof code !== 'string' || code.length === 0) {
      return json({ error: 'Invalid code' }, 400);
    }

    const codeSize = new TextEncoder().encode(code).byteLength;
    if (codeSize > CONFIG.MAX_CODE_SIZE) {
      return json({ error: 'Code too large' }, 413);
    }

    fileContent = code;
    filename = 'pasted-code.html';
  } else if (
    file &&
    typeof file === 'object' &&
    typeof file.size === 'number' &&
    typeof file.stream === 'function'
  ) {
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      return json({ error: 'File too large' }, 413);
    }

    filename = typeof file.name === 'string' ? file.name : '';
    const lowerName = filename.toLowerCase();
    if (!encryptionRequested && !lowerName.endsWith('.html') && !lowerName.endsWith('.htm')) {
      return json({ error: 'Only .html or .htm allowed' }, 400);
    }

    if (encryptionRequested && !filename) filename = 'encrypted.html';

    fileContent = file.stream();
  } else {
    return json({ error: 'Missing file or code' }, 400);
  }

  let id;
  if (customSlug !== null && customSlug !== '') {
    const validated = validateSlug(customSlug);
    if (!validated) return json({ error: 'Invalid slug format' }, 400);

    const database = getDatabase(env);
    const existing = await database
      .prepare('SELECT id FROM files WHERE id = ?')
      .bind(validated)
      .first();
    if (existing) return json({ error: 'Slug already taken' }, 409);
    id = validated;
  } else {
    id = generateId();
  }

  const bucket = getBucket(env);
  const database = getDatabase(env);
  const createdAt = Math.floor(Date.now() / 1000);
  const storedContentType = encryptionRequested
    ? 'application/octet-stream'
    : 'text/html';
  let objectStored = false;
  try {
    await bucket.put(id, fileContent, {
      httpMetadata: { contentType: storedContentType },
    });
    objectStored = true;
    await database
      .prepare(
        `INSERT INTO files
         (id, filename, owner_id, encrypted, encryption_version, encryption_metadata, title, description, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        filename,
        currentUser?.id || null,
        encryptionRequested ? 1 : 0,
        encryptionMetadata?.version || 0,
        encryptionMetadata ? JSON.stringify(encryptionMetadata) : null,
        title,
        description,
        tags,
        createdAt
      )
      .run();
  } catch (error) {
    if (objectStored) {
      try {
        await bucket.delete(id);
      } catch (cleanupError) {
        console.error('Storage cleanup failed:', cleanupError);
      }
    }
    console.error('Upload write failed:', error);
    return json({ error: 'Storage write failed' }, 500);
  }

  const shareUrl = `${new URL(request.url).origin}/view/${id}`;
  return json({ url: shareUrl, id });
}