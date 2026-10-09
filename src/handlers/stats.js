import { getDatabase, json } from '../security.js';
import { I18N, resolveLang } from '../i18n.js';
import { STYLES } from '../ui/styles.js';
import { renderNav, renderFooter } from '../ui/theme.js';

function validId(id) {
  return Boolean(id) && /^[a-z0-9-]+$/i.test(id);
}

export async function handleStats(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.slice('/api/stats/'.length);
  if (!validId(id)) return json({ error: 'Invalid ID' }, 400);

  const database = getDatabase(env);
  if (!database) return json({ error: 'Database not available' }, 500);

  const file = await database
    .prepare('SELECT id, title, created_at, expires_at FROM files WHERE id = ?')
    .bind(id)
    .first();

  if (!file) return json({ error: 'Not found' }, 404);

  const now = Math.floor(Date.now() / 1000);
  const daysSinceCreation = Math.max(1, Math.floor((now - file.created_at) / 86400));

  const totalVisits = await database
    .prepare('SELECT COUNT(*) as count FROM visits WHERE file_id = ?')
    .bind(id)
    .first();

  const uniqueVisitors = await database
    .prepare('SELECT COUNT(DISTINCT ip_hash) as count FROM visits WHERE file_id = ?')
    .bind(id)
    .first();

  const recentVisits = await database
    .prepare(
      `SELECT visited_at FROM visits WHERE file_id = ? ORDER BY visited_at DESC LIMIT 30`
    )
    .bind(id)
    .all();

  const countries = await database
    .prepare(
      `SELECT country, COUNT(*) as count FROM visits WHERE file_id = ? AND country != '' GROUP BY country ORDER BY count DESC LIMIT 10`
    )
    .bind(id)
    .all();

  return json({
    file: {
      id: file.id,
      title: file.title,
      created_at: file.created_at,
      expires_at: file.expires_at,
    },
    stats: {
      totalVisits: totalVisits?.count || 0,
      uniqueVisitors: uniqueVisitors?.count || 0,
      avgPerDay: ((totalVisits?.count || 0) / daysSinceCreation).toFixed(1),
      countries: countries?.results || [],
      recentVisits: (recentVisits?.results || []).map(v => v.visited_at),
    },
  });
}

export async function handleReport(request, env) {
  const url = new URL(request.url);
  const lang = resolveLang(request);
  const t = I18N[lang] || I18N.en;

  const database = getDatabase(env);
  if (!database) return new Response('Database not available', { status: 500 });

  // 获取全局统计
  const totalFiles = await database
    .prepare('SELECT COUNT(*) as count FROM files')
    .first();

  const totalVisits = await database
    .prepare('SELECT COUNT(*) as count FROM visits')
    .first();

  const todayFiles = await database
    .prepare('SELECT COUNT(*) as count FROM files WHERE created_at > ?')
    .bind(Math.floor(Date.now() / 1000) - 86400)
    .first();

  const todayVisits = await database
    .prepare('SELECT COUNT(*) as count FROM visits WHERE visited_at > ?')
    .bind(Math.floor(Date.now() / 1000) - 86400)
    .first();

  const topFiles = await database
    .prepare(
      `SELECT f.id, f.title, COUNT(v.id) as visit_count
       FROM files f LEFT JOIN visits v ON f.id = v.file_id
       GROUP BY f.id ORDER BY visit_count DESC LIMIT 10`
    )
    .all();

  const translations = {
    zh: {
      title: '数据报告 - Oh My Share',
      reportTitle: '数据报告',
      overviewTitle: '概览',
      totalFiles: '总文件数',
      totalVisits: '总访问量',
      todayFiles: '今日新增',
      todayVisits: '今日访问',
      topTitle: '热门内容',
    },
    en: {
      title: 'Report - Oh My Share',
      reportTitle: 'Data Report',
      overviewTitle: 'Overview',
      totalFiles: 'Total Files',
      totalVisits: 'Total Visits',
      todayFiles: 'Today\'s New',
      todayVisits: 'Today\'s Visits',
      topTitle: 'Top Content',
    },
  };
  const msg = translations[lang] || translations.en;

  return new Response(`<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${msg.title}</title>
<style>${STYLES}</style>
</head>
<body>
${renderNav(
  lang,
  '',
  `<button class="lang-switch" id="langBtn" onclick="var u=new URL(location.href);u.searchParams.set('lang',u.searchParams.get('lang')==='zh'?'en':'zh');location.href=u.toString()"><span id="langBtnText">${lang === 'zh' ? 'EN' : '中'}</span></button>
      <button class="account-button" id="accountBtn" onclick="location.href='/'">${t.accountBtn}</button>`
)}
<div class="container">
  <div class="header">
    <h1>Oh My Share</h1>
    <p>${msg.reportTitle}</p>
  </div>
  <div class="form-content">
    <div class="metadata-fields">
      <h3>${msg.overviewTitle}</h3>
      <div class="input-group">
        <label>${msg.totalFiles}</label>
        <p>${totalFiles?.count || 0}</p>
      </div>
      <div class="input-group">
        <label>${msg.totalVisits}</label>
        <p>${totalVisits?.count || 0}</p>
      </div>
      <div class="input-group">
        <label>${msg.todayFiles}</label>
        <p>${todayFiles?.count || 0}</p>
      </div>
      <div class="input-group">
        <label>${msg.todayVisits}</label>
        <p>${todayVisits?.count || 0}</p>
      </div>
    </div>
    <div class="metadata-fields">
      <h3>${msg.topTitle}</h3>
      <div id="topFiles">
        ${(topFiles?.results || []).map(f => `
          <div class="input-group">
            <label>${f.title || f.id}</label>
            <p>${f.visit_count} visits</p>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
</div>
${renderFooter(lang)}
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
