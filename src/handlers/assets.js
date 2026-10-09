import { getCurrentUser, isSameOriginRequest } from '../auth.js';
import { getBucket, getDatabase, json } from '../security.js';

function unauthorized(request) {
  const origin = new URL(request.url).origin;
  return json({ error: 'Authentication required', code: 'errUnauthorized' }, 401, {
    'Cache-Control': 'no-store',
    'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
  });
}

function assetUrl(request, id) {
  return `${new URL(request.url).origin}/view/${encodeURIComponent(id)}`;
}

export async function handleListAssets(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) return unauthorized(request);

  const database = getDatabase(env);
  const result = await database
    .prepare(
      `SELECT id, filename, encrypted, encryption_version, title, description, tags, created_at, edit_token,
              published_at, password_hash, expires_at
       FROM files
       WHERE owner_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 100`
    )
    .bind(user.id)
    .all();

  const assets = (result.results || []).map((asset) => ({
    id: asset.id,
    filename: asset.filename,
    encrypted: Boolean(asset.encrypted),
    encryptionVersion: asset.encryption_version || null,
    title: asset.title || '',
    description: asset.description || '',
    tags: asset.tags || '',
    createdAt: asset.created_at,
    editToken: asset.edit_token || null,
    published: Boolean(asset.published_at),
    publishedAt: asset.published_at || 0,
    passwordProtected: Boolean(asset.password_hash),
    expiresAt: asset.expires_at || null,
    url: assetUrl(request, asset.id),
  }));

  return json({ assets }, 200, { 'Cache-Control': 'no-store' });
}

export async function handlePublishAsset(request, env, id) {
  if (!isSameOriginRequest(request)) {
    return json({ error: 'Invalid origin', code: 'errForbidden' }, 403);
  }

  const user = await getCurrentUser(request, env);
  if (!user) return unauthorized(request);
  if (!id || !/^[a-z0-9-]+$/i.test(id)) return json({ error: 'Invalid ID' }, 400);

  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const published = Boolean(body && body.published);

  const database = getDatabase(env);
  const asset = await database
    .prepare(
      'SELECT id, encrypted, password_hash, expires_at, published_at FROM files WHERE id = ? AND owner_id = ?'
    )
    .bind(id, user.id)
    .first();
  if (!asset) return json({ error: 'Asset not found', code: 'errNotFound' }, 404);

  const now = Math.floor(Date.now() / 1000);
  if (published) {
    if (asset.encrypted) {
      return json({ error: 'Encrypted assets cannot be published', code: 'errCannotPublish' }, 400);
    }
    if (asset.password_hash) {
      return json({ error: 'Password protected assets cannot be published', code: 'errCannotPublish' }, 400);
    }
    if (asset.expires_at && asset.expires_at <= now) {
      return json({ error: 'Expired assets cannot be published', code: 'errCannotPublish' }, 400);
    }
  }

  const publishedAt = published ? asset.published_at || now : 0;
  await database
    .prepare('UPDATE files SET published_at = ? WHERE id = ? AND owner_id = ?')
    .bind(publishedAt, id, user.id)
    .run();

  return json({ ok: true, published, publishedAt }, 200, { 'Cache-Control': 'no-store' });
}

export async function handleDeleteAsset(request, env, id) {
  if (!isSameOriginRequest(request)) {
    return json({ error: 'Invalid origin', code: 'errForbidden' }, 403);
  }

  const user = await getCurrentUser(request, env);
  if (!user) return unauthorized(request);
  if (!id || !/^[a-z0-9-]+$/i.test(id)) return json({ error: 'Invalid ID' }, 400);

  const database = getDatabase(env);
  const asset = await database
    .prepare('SELECT id FROM files WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .first();
  if (!asset) return json({ error: 'Asset not found', code: 'errNotFound' }, 404);

  try {
    await getBucket(env).delete(id);
    await database
      .prepare('DELETE FROM files WHERE id = ? AND owner_id = ?')
      .bind(id, user.id)
      .run();
  } catch (error) {
    console.error('Delete asset failed:', error);
    return json({ error: 'Delete failed', code: 'errDeleteFailed' }, 503, {
      'Cache-Control': 'no-store',
    });
  }

  return json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
}