// Daily monitoring handler - runs via Cloudflare Cron Trigger
// Collects analytics data and stores in D1

import { purgeExpiredFiles } from './purge.js';

export async function runDailyMonitor(env) {
  const today = new Date().toISOString().split('T')[0];
  console.log(`[Monitor] Running daily monitor for ${today}`);

  try {
    // Expired shares: actually delete rows + R2 objects (not just block access)
    await purgeExpiredFiles(env, 500);

    // Collect stats from D1 (upload counts, etc.)
    const stats = await collectStats(env, today);

    // Store daily snapshot
    await saveDailySnapshot(env, today, stats);

    console.log(`[Monitor] Done: ${JSON.stringify(stats)}`);

    // Submit fresh URLs to IndexNow (Bing, Yandex, Naver)
    await submitIndexNow(env);
  } catch (error) {
    console.error(`[Monitor] Error: ${error.message}`);
    throw error;
  }
}

const INDEXNOW_KEY = 'dab46c9c750b7c083d5723b8ed9653a5';

async function submitIndexNow(env) {
  const urls = [
    'https://openanthropic.com/',
    'https://openanthropic.com/html-viewer',
    'https://openanthropic.com/code-share',
    'https://openanthropic.com/codepen-alternative',
    'https://openanthropic.com/ai-html-publish',
    'https://openanthropic.com/gallery',
  ];

  try {
    const recent = await env.DB.prepare(
      `SELECT id FROM files
       WHERE encrypted = 0 AND password_hash IS NULL
         AND published_at > 0
         AND reported_at IS NULL
         AND (expires_at IS NULL OR expires_at = 0 OR expires_at > strftime('%s','now'))
       ORDER BY created_at DESC LIMIT 100`
    ).all();

    for (const row of recent.results || []) {
      urls.push(`https://openanthropic.com/gallery/${row.id}`);
    }

    // Reported/taken-down content: ask engines to recrawl so they drop it (451)
    const reported = await env.DB.prepare(
      `SELECT id FROM files
       WHERE reported_at IS NOT NULL
       ORDER BY reported_at DESC LIMIT 20`
    ).all();

    for (const row of reported.results || []) {
      urls.push(`https://openanthropic.com/view/${row.id}`);
    }
  } catch (error) {
    console.error(`[Monitor] IndexNow: failed to list files: ${error.message}`);
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: 'openanthropic.com',
      key: INDEXNOW_KEY,
      keyLocation: `https://openanthropic.com/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  });

  console.log(`[Monitor] IndexNow: ${res.status} for ${urls.length} URLs`);
}

async function collectStats(env, date) {
  const db = env.DB;

  // Total shares
  const totalShares = await db
    .prepare('SELECT COUNT(*) as count FROM files')
    .first();

  // Shares today
  const startOfDay = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
  const endOfDay = startOfDay + 86400;

  const sharesToday = await db
    .prepare('SELECT COUNT(*) as count FROM files WHERE created_at >= ? AND created_at < ?')
    .bind(startOfDay, endOfDay)
    .first();

  // Total users
  const totalUsers = await db
    .prepare('SELECT COUNT(*) as count FROM users')
    .first();

  // New users today
  const newUsersToday = await db
    .prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?')
    .bind(startOfDay, endOfDay)
    .first();

  // Recent shares (last 10)
  const recentShares = await db
    .prepare('SELECT id, filename, created_at FROM files ORDER BY created_at DESC LIMIT 10')
    .all();

  return {
    totalShares: totalShares?.count || 0,
    sharesToday: sharesToday?.count || 0,
    totalUsers: totalUsers?.count || 0,
    newUsersToday: newUsersToday?.count || 0,
    recentShares: recentShares?.results || [],
  };
}

async function saveDailySnapshot(env, date, stats) {
  const db = env.DB;

  // Create table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT PRIMARY KEY,
      total_shares INTEGER,
      shares_today INTEGER,
      total_users INTEGER,
      new_users_today INTEGER,
      created_at INTEGER
    )
  `);

  // Upsert snapshot
  await db
    .prepare(`
      INSERT INTO daily_stats (date, total_shares, shares_today, total_users, new_users_today, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        total_shares = excluded.total_shares,
        shares_today = excluded.shares_today,
        total_users = excluded.total_users,
        new_users_today = excluded.new_users_today,
        created_at = excluded.created_at
    `)
    .bind(
      date,
      stats.totalShares,
      stats.sharesToday,
      stats.totalUsers,
      stats.newUsersToday,
      Math.floor(Date.now() / 1000)
    )
    .run();
}
