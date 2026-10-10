import { getBucket } from '../security.js';

// Expired files used to be "hidden" only — their rows in D1 and objects in R2
// lived forever. Purge them (visits cascade via FK) so storage stays bounded.
export async function purgeExpiredFiles(env, limit = 100) {
  const db = env.DB;
  if (!db) return 0;

  const now = Math.floor(Date.now() / 1000);
  let purged = 0;

  try {
    const { results } = await db
      .prepare(
        `SELECT id FROM files
         WHERE expires_at > 0 AND expires_at < ?
         ORDER BY expires_at ASC
         LIMIT ?`
      )
      .bind(now, Math.max(1, Math.min(500, limit)))
      .all();

    const bucket = getBucket(env);

    for (const row of results || []) {
      try {
        if (bucket) await bucket.delete(row.id);
      } catch (error) {
        console.error(`[Purge] R2 delete failed for ${row.id}: ${error.message}`);
      }
      try {
        await db.prepare('DELETE FROM files WHERE id = ?').bind(row.id).run();
        purged += 1;
      } catch (error) {
        console.error(`[Purge] D1 delete failed for ${row.id}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`[Purge] query failed: ${error.message}`);
  }

  if (purged > 0) console.log(`[Purge] removed ${purged} expired files`);
  return purged;
}
