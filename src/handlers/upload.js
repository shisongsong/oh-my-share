import { CONFIG } from '../config.js';
import { getCurrentUser } from '../auth.js';
import { hasPaidEntitlement } from '../entitlements.js';
import { parseEncryptionMetadata } from '../encryption.js';
import { hashPassword, generateEditToken } from '../crypto.js';
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
  let isJson = false;
  let jsonData = null;
  
  const contentType = request.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    // JSON 格式
    isJson = true;
    try {
      jsonData = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }
  } else {
    // FormData 格式
    try {
      formData = await request.formData();
    } catch {
      return json({ error: 'Invalid form data' }, 400);
    }
  }

  // Extract data from either FormData or JSON
  let file, code, customSlug, encryptionRequested, title, description, tags, password, expiresIn, encryptionMetadataData, publishRequested, remixedFrom;
  
  if (isJson) {
    file = jsonData.file;
    code = jsonData.code;
    customSlug = jsonData.slug;
    encryptionRequested = jsonData.encrypted === '1' || jsonData.encrypted === true;
    title = (jsonData.title || '').toString().slice(0, 200);
    description = (jsonData.description || '').toString().slice(0, 1000);
    tags = (jsonData.tags || '').toString().slice(0, 500);
    password = (jsonData.password || '').toString();
    expiresIn = parseInt(jsonData.expiresIn || '0', 10);
    encryptionMetadataData = jsonData.encryption_metadata || jsonData.encryptionMetadata;
    publishRequested = jsonData.published === true || jsonData.published === '1';
    remixedFrom = (jsonData.remixedFrom || jsonData.remixed_from || '').toString();
  } else {
    file = formData.get('file');
    code = formData.get('code');
    customSlug = formData.get('slug');
    encryptionRequested = formData.get('encrypted') === '1';
    title = (formData.get('title') || '').toString().slice(0, 200);
    description = (formData.get('description') || '').toString().slice(0, 1000);
    tags = (formData.get('tags') || '').toString().slice(0, 500);
    password = (formData.get('password') || '').toString();
    expiresIn = parseInt(formData.get('expiresIn') || '0', 10);
    encryptionMetadataData = formData.get('encryption_metadata') || formData.get('encryptionMetadata');
    publishRequested = formData.get('published') === '1';
    remixedFrom = (formData.get('remixedFrom') || '').toString();
  }

  let currentUser = null;
  let encryptionMetadata = null;
  if (encryptionRequested) {
    currentUser = await getCurrentUser(request, env);
    if (!currentUser) return json({ error: 'Authentication required' }, 401);

    const canEncrypt = await hasPaidEntitlement(env, currentUser.id);
    if (!canEncrypt) return json({ error: 'Paid plan required for encryption' }, 403);

    encryptionMetadata = parseEncryptionMetadata(encryptionMetadataData);
    if (!encryptionMetadata) return json({ error: 'Invalid encryption metadata' }, 400);
  } else {
    currentUser = await getCurrentUser(request, env);
  }

  if (publishRequested) {
    if (!currentUser) return json({ error: 'Authentication required', code: 'errUnauthorized' }, 401);
    if (encryptionRequested) {
      return json({ error: 'Encrypted uploads cannot be published', code: 'errCannotPublish' }, 400);
    }
    if (password && password.length > 0) {
      return json({ error: 'Password protected uploads cannot be published', code: 'errCannotPublish' }, 400);
    }
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
  if (customSlug && customSlug !== null && customSlug !== '') {
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

  // 生成编辑密钥
  const editToken = generateEditToken();

  // 处理密码哈希
  let passwordHash = null;
  if (password && password.length > 0) {
    if (password.length > CONFIG.PAGE_PASSWORD_MAX_LENGTH) {
      return json({ error: 'Password too long' }, 400);
    }
    passwordHash = await hashPassword(password);
  }

  // 处理过期时间
  let expiresAt = 0;
  if (expiresIn > 0) {
    expiresAt = createdAt + expiresIn;
  }

  let objectStored = false;
  try {
    await bucket.put(id, fileContent, {
      httpMetadata: { contentType: storedContentType },
    });
    objectStored = true;
    await database
      .prepare(
        `INSERT INTO files
         (id, filename, owner_id, encrypted, encryption_version, encryption_metadata, 
          title, description, tags, created_at, edit_token, password_hash, expires_at, updated_at, published_at, remixed_from)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        createdAt,
        editToken,
        passwordHash,
        expiresAt,
        createdAt,
        publishRequested ? createdAt : 0,
        remixedFrom && /^[a-z0-9-]{1,64}$/i.test(remixedFrom) ? remixedFrom : null
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
  return json({
    url: shareUrl,
    id,
    editToken,
    expiresAt: expiresAt || null,
  });
}
