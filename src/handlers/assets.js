import { getCurrentUser, isSameOriginRequest } from '../auth.js';
import { getBucket, getDatabase, json } from '../security.js';

function unauthorized(request) {
  const origin = new URL(request.url).origin;
  return json({ error: 'Authentication required' }, 401, {
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
      `SELECT id, filename, encrypted, encryption_version, title, description, tags, created_at, edit_token
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
    url: assetUrl(request, asset.id),
  }));

  return json({ assets }, 200, { 'Cache-Control': 'no-store' });
}

export async function handleDeleteAsset(request, env, id) {
  if (!isSameOriginRequest(request)) return json({ error: 'Invalid origin' }, 403);

  const user = await getCurrentUser(request, env);
  if (!user) return unauthorized(request);
  if (!id || !/^[a-z0-9-]+$/i.test(id)) return json({ error: 'Invalid ID' }, 400);

  const database = getDatabase(env);
  const asset = await database
    .prepare('SELECT id FROM files WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .first();
  if (!asset) return json({ error: 'Asset not found' }, 404);

  await getBucket(env).delete(id);
  await database
    .prepare('DELETE FROM files WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .run();

  return json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
}