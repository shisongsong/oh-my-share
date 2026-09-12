import { getCurrentUser, isSameOriginRequest } from '../auth.js';
import { getBucket, getDatabase, json } from '../security.js';

function unauthorized() {
  return json({ error: 'Authentication required' }, 401, { 'Cache-Control': 'no-store' });
}

function assetUrl(request, id) {
  return `${new URL(request.url).origin}/view/${encodeURIComponent(id)}`;
}

export async function handleListAssets(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) return unauthorized();

  const database = getDatabase(env);
  const result = await database
    .prepare(
      `SELECT id, filename, encrypted, encryption_version, created_at
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
    createdAt: asset.created_at,
    url: assetUrl(request, asset.id),
  }));

  return json({ assets }, 200, { 'Cache-Control': 'no-store' });
}

export async function handleDeleteAsset(request, env, id) {
  if (!isSameOriginRequest(request)) return json({ error: 'Invalid origin' }, 403);

  const user = await getCurrentUser(request, env);
  if (!user) return unauthorized();
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