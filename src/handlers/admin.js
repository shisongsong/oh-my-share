import { I18N, resolveLang } from '../i18n.js';
import { renderNav, accountActionHtml } from '../ui/theme.js';
import { renderDocument } from '../ui/render-document.js';
import { getCurrentUser, isSameOriginRequest } from '../auth.js';
import { getDatabase, json } from '../security.js';
import { escapeHtml } from './gallery.js';
import { notFoundPage } from './seo.js';

// Admin dashboard. Access is granted by the ADMIN_EMAILS secret (comma-separated,
// case-insensitive). There is no password of its own; the only write actions are
// report moderation (restore/hide), protected by the admin session and an
// Origin check.
const ALLOWED_DAYS = [1, 7, 30, 90];

const ADMIN_TXT = {
  zh: {
    title: '运营看板',
    loginTitle: '需要管理员登录',
    loginLead: '请先在首页用管理员账号登录，然后刷新本页。',
    homeLink: '返回首页',
    lead: '最近 {days} 天的真实新增，默认隐藏你自己的账号和测试数据。',
    users: '新增用户',
    works: '新增作品',
    anon: '匿名上传',
    published: '已发布',
    views: '浏览量',
    range: '时间范围',
    range1: '24 小时',
    range7: '7 天',
    range30: '30 天',
    range90: '90 天',
    showAll: '显示全部（含内部/测试）',
    hideInternal: '隐藏内部/测试',
    newUsersHeading: '新增用户',
    newWorksHeading: '新增作品',
    topHeading: '本周期浏览最多的作品',
    email: '邮箱',
    registeredAt: '注册时间（北京时间）',
    workCount: '作品数',
    time: '时间',
    work: '作品',
    author: '作者',
    source: '来源',
    sourceHeading: '来源分布',
    sourceMcp: 'MCP',
    sourceApi: 'REST API',
    sourceWeb: '网页',
    sourceA2a: 'A2A',
    sourceUnknown: '未标记',
    sourceNote: '来源从本次 MCP 升级后开始记录；历史数据没有来源标记。',
    status: '状态',
    anonymous: '匿名',
    noUsers: '该时间段没有真实新增用户。',
    noWorks: '该时间段没有真实新增作品。',
    noTop: '该时间段还没有浏览记录。',
    badgePublished: '已发布',
    badgeEncrypted: '加密',
    badgeExpired: '已过期',
    badgeNormal: '普通',
    badgeSite: '目录',
    generatedAt: '生成于',
    note: '管理操作需管理员会话 · 数据来自 D1',
    reportsHeading: '举报队列',
    reporters: '举报人数',
    reason: '原因',
    moderation: '操作',
    restore: '恢复',
    takeDown: '下架',
    noReports: '没有待处理举报。',
    reportedHidden: '已隐藏',
    reportedVisible: '可见',
  },
  en: {
    title: 'Admin',
    loginTitle: 'Admin sign-in required',
    loginLead: 'Sign in with an admin account on the home page, then reload this page.',
    homeLink: 'Back to home',
    lead: 'Real activity in the last {days} day(s). Your own accounts and test rows are hidden by default.',
    users: 'New users',
    works: 'New works',
    anon: 'Anonymous uploads',
    published: 'Published',
    views: 'Views',
    range: 'Range',
    range1: '24 hours',
    range7: '7 days',
    range30: '30 days',
    range90: '90 days',
    showAll: 'Show everything (incl. internal/test)',
    hideInternal: 'Hide internal/test',
    newUsersHeading: 'New users',
    newWorksHeading: 'New works',
    topHeading: 'Most viewed this period',
    email: 'Email',
    registeredAt: 'Registered (UTC+8)',
    workCount: 'Works',
    time: 'Time',
    work: 'Work',
    author: 'Author',
    source: 'Source',
    sourceHeading: 'Traffic sources',
    sourceMcp: 'MCP',
    sourceApi: 'REST API',
    sourceWeb: 'Web',
    sourceA2a: 'A2A',
    sourceUnknown: 'Untagged',
    sourceNote: 'Sources are recorded after the MCP upgrade; older rows have no tag.',
    status: 'Status',
    anonymous: 'Anonymous',
    noUsers: 'No real new users in this period.',
    noWorks: 'No real new works in this period.',
    noTop: 'No views recorded in this period.',
    badgePublished: 'Published',
    badgeEncrypted: 'Encrypted',
    badgeExpired: 'Expired',
    badgeNormal: 'Normal',
    badgeSite: 'Folder',
    generatedAt: 'Generated',
    note: 'Moderation requires an admin session · data from D1',
    reportsHeading: 'Reports',
    reporters: 'Reporters',
    reason: 'Reason',
    moderation: 'Actions',
    restore: 'Restore',
    takeDown: 'Take down',
    noReports: 'No reports pending.',
    reportedHidden: 'Hidden',
    reportedVisible: 'Visible',
  },
};

const ADMIN_CSS = `
.admin-main { max-width: 1080px; margin: 0 auto; padding: clamp(28px, 5vw, 48px) var(--space-5) var(--space-10); }
.admin-main h1 { font-size: clamp(24px, 3.4vw, 32px); font-weight: 700; letter-spacing: -0.02em; margin-bottom: var(--space-2); }
.admin-lead { color: var(--color-text-secondary); font-size: 14.5px; line-height: 1.6; margin-bottom: var(--space-5); }
.admin-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: var(--space-6); }
.admin-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.admin-tab { display: inline-flex; align-items: center; min-height: 34px; padding: 0 14px; border: 1px solid var(--color-hairline-strong); border-radius: var(--radius-pill); font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-decoration: none; }
.admin-tab:hover { border-color: var(--color-accent-pink); color: var(--color-accent-pink); }
.admin-tab.is-active { border-color: var(--color-accent-pink); color: var(--color-accent-pink); }
.admin-filter { font-size: 13px; color: var(--color-text-tertiary); text-decoration: none; border-bottom: 1px dashed currentColor; }
.admin-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: var(--space-7); }
.admin-card { border: 1px solid var(--color-hairline); border-radius: var(--radius-card); background: var(--color-surface); padding: 16px 18px; }
.admin-card dt { font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--color-text-tertiary); margin-bottom: 6px; }
.admin-card dd { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
.admin-section { margin-bottom: var(--space-8); }
.admin-section h2 { font-size: 16px; font-weight: 700; margin-bottom: var(--space-3); }
.admin-table-wrap { overflow-x: auto; border: 1px solid var(--color-hairline); border-radius: var(--radius-card); background: var(--color-surface); }
.admin-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.admin-table th, .admin-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--color-hairline); white-space: nowrap; }
.admin-table th { font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--color-text-tertiary); }
.admin-table tbody tr:last-child td { border-bottom: none; }
.admin-table .cell-work { white-space: normal; min-width: 220px; max-width: 420px; }
.admin-table a { color: var(--color-accent-strong); text-decoration: none; }
.admin-table a:hover { text-decoration: underline; }
.admin-badge { display: inline-block; margin-right: 4px; padding: 2px 8px; border-radius: var(--radius-pill); border: 1px solid var(--color-hairline-strong); font-size: 11.5px; font-weight: 600; color: var(--color-text-secondary); }
.admin-empty { padding: 22px; color: var(--color-text-tertiary); font-size: 13.5px; }
.admin-foot { color: var(--color-text-tertiary); font-size: 12.5px; }
.admin-inline-form { display: inline-flex; gap: 6px; }
.admin-action { min-height: 28px; padding: 0 10px; border: 1px solid var(--color-hairline-strong); border-radius: var(--radius-pill); background: transparent; color: var(--color-text); font-size: 12px; font-weight: 600; cursor: pointer; }
.admin-action:hover { border-color: var(--color-accent-pink); color: var(--color-accent-pink); }
`;

export function adminEmails(env) {
  return String(env?.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user, env) {
  if (!user || !user.email) return false;
  return adminEmails(env).includes(String(user.email).toLowerCase());
}

const TEST_EMAIL_RE = /@test\.(com|org|net)$|@example\.(com|org|net)$|(^|[._+-])(e2e|glama|mcp-test|mcp-agent)([._+-]|@)/i;
const TEST_TITLE_RE = /\be2e|\bplaywright\b|\bglama\b|测试/i;

export function isTestEmail(email) {
  return TEST_EMAIL_RE.test(String(email || ''));
}

export function isTestTitle(title) {
  return TEST_TITLE_RE.test(String(title || ''));
}

function fmtStamp(ts) {
  const unix = Number(ts);
  if (!Number.isFinite(unix) || unix <= 0) return '—';
  return new Date((unix + 8 * 3600) * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

function badgeFor(row, t, now) {
  const out = [];
  if (row.kind === 'site') out.push(t.badgeSite);
  if (row.published_at > 0) out.push(t.badgePublished);
  if (row.encrypted) out.push(t.badgeEncrypted);
  if (row.expires_at > 0 && row.expires_at <= now) out.push(t.badgeExpired);
  if (!out.length) out.push(t.badgeNormal);
  return out.map((label) => `<span class="admin-badge">${escapeHtml(label)}</span>`).join('');
}

const SOURCE_KEYS = ['mcp', 'api', 'web', 'a2a', 'unknown'];

function sourceKey(row) {
  return ['mcp', 'api', 'web', 'a2a'].includes(row.source) ? row.source : 'unknown';
}

function sourceBadge(row, t) {
  const labels = {
    mcp: t.sourceMcp,
    api: t.sourceApi,
    web: t.sourceWeb,
    a2a: t.sourceA2a,
    unknown: t.sourceUnknown,
  };
  const title = row.user_agent ? ` title="${escapeHtml(row.user_agent)}"` : '';
  return `<span class="admin-badge"${title}>${escapeHtml(labels[sourceKey(row)])}</span>`;
}

function renderTable(headers, rows, emptyText) {
  if (!rows.length) return `<div class="admin-empty">${escapeHtml(emptyText)}</div>`;
  return `<div class="admin-table-wrap"><table class="admin-table">
  <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.join('')}</tbody>
</table></div>`;
}

function noStore(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export async function handleAdminPage(request, env) {
  const url = new URL(request.url);
  const lang = resolveLang(request);
  const t = I18N[lang] || I18N.en;
  const a = ADMIN_TXT[lang] || ADMIN_TXT.en;
  const viewer = await getCurrentUser(request, env);

  const altLang = lang === 'zh' ? 'en' : 'zh';
  const navActions = `<a class="lang-switch" href="/admin?lang=${altLang}">${altLang === 'zh' ? '中文' : 'EN'}</a>${accountActionHtml(t, viewer)}`;

  if (!viewer) {
    return noStore(
      renderDocument({
        lang,
        title: a.loginTitle,
        description: a.loginLead,
        robots: 'noindex,nofollow',
        includeBaseCss: true,
        nav: renderNav(lang, '', navActions),
        body: `<main class="admin-main">
  <h1>${escapeHtml(a.loginTitle)}</h1>
  <p class="admin-lead">${escapeHtml(a.loginLead)}</p>
  <p><a class="admin-tab" href="/">${escapeHtml(a.homeLink)}</a></p>
</main>`,
      }),
      401
    );
  }

  if (!isAdminUser(viewer, env)) {
    return noStore(notFoundPage(lang, viewer), 404);
  }

  const database = getDatabase(env);
  if (!database) {
    return noStore(
      renderDocument({
        lang,
        title: a.title,
        robots: 'noindex,nofollow',
        nav: renderNav(lang, '', navActions),
        body: '<main class="admin-main"><h1>Database not available</h1></main>',
      }),
      500
    );
  }

  const requestedDays = Number(url.searchParams.get('days'));
  const days = ALLOWED_DAYS.includes(requestedDays) ? requestedDays : 7;
  const showAll = url.searchParams.get('all') === '1';
  const since = Math.floor(Date.now() / 1000) - days * 86400;

  const users =
    (
      await database
        .prepare(
          `SELECT id, email, created_at
           FROM users
           WHERE typeof(created_at) = 'integer' AND created_at >= ?
           ORDER BY created_at DESC LIMIT 200`
        )
        .bind(since)
        .all()
    ).results || [];

  const works =
    (
      await database
        .prepare(
          `SELECT f.id, f.kind, f.title, f.filename, f.owner_id, f.created_at, f.published_at,
                  f.expires_at, f.encrypted, f.source, f.user_agent, u.email
           FROM files f LEFT JOIN users u ON u.id = f.owner_id
           WHERE typeof(f.created_at) = 'integer' AND f.created_at >= ?
           ORDER BY f.created_at DESC LIMIT 300`
        )
        .bind(since)
        .all()
    ).results || [];

  const viewRows =
    (
      await database
        .prepare(
          `SELECT file_id, COUNT(*) AS n
           FROM visits
           WHERE visited_at >= ?
           GROUP BY file_id
           ORDER BY n DESC LIMIT 200`
        )
        .bind(since)
        .all()
    ).results || [];

  const totalViews =
    ((
      await database
        .prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?')
        .bind(since)
        .first()
    )?.n) || 0;

  const reports =
    (
      await database
        .prepare(
          `SELECT f.id, f.title, f.filename, f.reported_at, f.report_count, f.published_at, u.email,
                  (SELECT COUNT(DISTINCT r.reporter_hash) FROM reports r WHERE r.file_id = f.id) AS reporters,
                  (SELECT GROUP_CONCAT(DISTINCT r.reason) FROM reports r WHERE r.file_id = f.id) AS reasons
           FROM files f LEFT JOIN users u ON u.id = f.owner_id
           WHERE EXISTS (SELECT 1 FROM reports r WHERE r.file_id = f.id)
           ORDER BY COALESCE(f.reported_at, 0) DESC, f.report_count DESC
           LIMIT 100`
        )
        .all()
    ).results || [];

  const viewMap = new Map(viewRows.map((r) => [r.file_id, Number(r.n) || 0]));
  const internalEmails = new Set(adminEmails(env));
  const hidden = (email, title) =>
    internalEmails.has(String(email || '').toLowerCase()) || isTestEmail(email) || isTestTitle(title);

  const usersShown = showAll ? users : users.filter((u) => !hidden(u.email, ''));
  const worksShown = showAll ? works : works.filter((w) => !hidden(w.email, w.title || w.filename));
  const now = Math.floor(Date.now() / 1000);

  const anonCount = worksShown.filter((w) => !w.owner_id).length;
  const publishedCount = worksShown.filter((w) => Number(w.published_at) > 0).length;
  const sourceCounts = Object.fromEntries(SOURCE_KEYS.map((key) => [key, 0]));
  for (const work of worksShown) sourceCounts[sourceKey(work)] += 1;
  const sourceCards = SOURCE_KEYS.map(
    (key) => `<div class="admin-card"><dt>${escapeHtml(a[`source${key[0].toUpperCase()}${key.slice(1)}`] || key)}</dt><dd>${sourceCounts[key]}</dd></div>`
  ).join('');

  const top = worksShown
    .map((w) => ({ ...w, periodViews: viewMap.get(w.id) || 0 }))
    .filter((w) => w.periodViews > 0)
    .sort((x, y) => y.periodViews - x.periodViews)
    .slice(0, 10);

  const filterHref = showAll
    ? `/admin?lang=${lang}&days=${days}`
    : `/admin?lang=${lang}&days=${days}&all=1`;
  const filterLabel = showAll ? a.hideInternal : a.showAll;

  const rangeTabs = ALLOWED_DAYS.map(
    (n) =>
      `<a class="admin-tab${n === days ? ' is-active' : ''}" href="/admin?lang=${lang}&days=${n}${showAll ? '&all=1' : ''}">${escapeHtml(a[`range${n}`])}</a>`
  ).join('');

  // Work counts per owner in one query instead of N+1.
  const counts = new Map();
  if (usersShown.length) {
    const placed = usersShown.map(() => '?').join(',');
    const rows =
      (
        await database
          .prepare(
            `SELECT owner_id, COUNT(*) AS n FROM files
             WHERE owner_id IN (${placed}) GROUP BY owner_id`
          )
          .bind(...usersShown.map((u) => u.id))
          .all()
      ).results || [];
    for (const r of rows) counts.set(r.owner_id, Number(r.n) || 0);
  }

  const userRowsWithCounts = usersShown.map(
    (u) =>
      `<tr><td>${escapeHtml(u.email)}</td><td>${escapeHtml(fmtStamp(u.created_at))}</td><td>${escapeHtml(String(counts.get(u.id) || 0))}</td></tr>`
  );

  const workRows = worksShown.map((w) => {
    const title = w.title || w.filename || w.id;
    return `<tr>
  <td>${escapeHtml(fmtStamp(w.created_at))}</td>
  <td class="cell-work"><a href="/view/${encodeURIComponent(w.id)}" rel="noopener">${escapeHtml(title)}</a></td>
  <td>${escapeHtml(w.email || a.anonymous)}</td>
  <td>${sourceBadge(w, a)}</td>
  <td>${escapeHtml(String(viewMap.get(w.id) || 0))}</td>
  <td>${badgeFor(w, a, now)}</td>
</tr>`;
  });

  const topRows = top.map((w) => {
    const title = w.title || w.filename || w.id;
    return `<tr>
  <td>${escapeHtml(String(w.periodViews))}</td>
  <td class="cell-work"><a href="/view/${encodeURIComponent(w.id)}" rel="noopener">${escapeHtml(title)}</a></td>
  <td>${escapeHtml(w.email || a.anonymous)}</td>
  <td>${sourceBadge(w, a)}</td>
  <td>${escapeHtml(fmtStamp(w.created_at))}</td>
</tr>`;
  });

  const reportRows = reports.map((r) => {
    const title = r.title || r.filename || r.id;
    const hiddenState = Number(r.reported_at) > 0 ? a.reportedHidden : a.reportedVisible;
    return `<tr>
  <td class="cell-work"><a href="/view/${encodeURIComponent(r.id)}" rel="noopener">${escapeHtml(title)}</a></td>
  <td>${escapeHtml(r.email || a.anonymous)}</td>
  <td>${escapeHtml(String(r.reporters || 0))}</td>
  <td>${escapeHtml(r.reasons || '')}</td>
  <td>${escapeHtml(hiddenState)}</td>
  <td><form method="POST" action="/api/admin/reports" class="admin-inline-form">
    <input type="hidden" name="id" value="${escapeHtml(r.id)}">
    <input type="hidden" name="days" value="${days}">
    <input type="hidden" name="lang" value="${lang}">
    <button class="admin-action" type="submit" name="action" value="restore">${escapeHtml(a.restore)}</button>
    <button class="admin-action" type="submit" name="action" value="hide">${escapeHtml(a.takeDown)}</button>
  </form></td>
</tr>`;
  });

  const lead = a.lead.replace('{days}', String(days));
  const body = `<main class="admin-main">
  <h1>${escapeHtml(a.title)}</h1>
  <p class="admin-lead">${escapeHtml(lead)}</p>
  <div class="admin-toolbar">
    <div class="admin-tabs">${rangeTabs}</div>
    <a class="admin-filter" href="${filterHref}">${escapeHtml(filterLabel)}</a>
  </div>
  <dl class="admin-cards">
    <div class="admin-card"><dt>${escapeHtml(a.users)}</dt><dd>${usersShown.length}</dd></div>
    <div class="admin-card"><dt>${escapeHtml(a.works)}</dt><dd>${worksShown.length}</dd></div>
    <div class="admin-card"><dt>${escapeHtml(a.anon)}</dt><dd>${anonCount}</dd></div>
    <div class="admin-card"><dt>${escapeHtml(a.published)}</dt><dd>${publishedCount}</dd></div>
    <div class="admin-card"><dt>${escapeHtml(a.views)}</dt><dd>${totalViews}</dd></div>
  </dl>
  <section class="admin-section">
    <h2>${escapeHtml(a.sourceHeading)}</h2>
    <dl class="admin-cards">${sourceCards}</dl>
    <p class="admin-foot">${escapeHtml(a.sourceNote)}</p>
  </section>
  <section class="admin-section">
    <h2>${escapeHtml(a.newUsersHeading)}</h2>
    ${renderTable([a.email, a.registeredAt, a.workCount], userRowsWithCounts, a.noUsers)}
  </section>
  <section class="admin-section">
    <h2>${escapeHtml(a.newWorksHeading)}</h2>
    ${renderTable([a.time, a.work, a.author, a.source, a.views, a.status], workRows, a.noWorks)}
  </section>
  <section class="admin-section">
    <h2>${escapeHtml(a.reportsHeading)}</h2>
    ${renderTable([a.work, a.author, a.reporters, a.reason, a.status, a.moderation], reportRows, a.noReports)}
  </section>
  <section class="admin-section">
    <h2>${escapeHtml(a.topHeading)}</h2>
    ${renderTable([a.views, a.work, a.author, a.source, a.time], topRows, a.noTop)}
  </section>
  <p class="admin-foot">${escapeHtml(a.generatedAt)} ${escapeHtml(fmtStamp(now))} (UTC+8) · ${escapeHtml(a.note)}</p>
</main>`;

  return noStore(
    renderDocument({
      lang,
      title: a.title,
      description: a.lead,
      robots: 'noindex,nofollow',
      nav: renderNav(lang, '', navActions),
      styles: [ADMIN_CSS],
      body,
      footer: false,
    })
  );
}


export async function handleAdminReportAction(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const viewer = await getCurrentUser(request, env);
  if (!viewer || !isAdminUser(viewer, env)) {
    return json({ error: 'Not found' }, 404);
  }
  if (!isSameOriginRequest(request)) {
    return json({ error: 'Invalid origin' }, 403);
  }

  const database = getDatabase(env);
  if (!database) return json({ error: 'Database unavailable' }, 503);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Invalid form data' }, 400);
  }

  const id = String(form.get('id') || '');
  const action = String(form.get('action') || '');
  const lang = form.get('lang') === 'zh' ? 'zh' : 'en';
  const days = [1, 7, 30, 90].includes(Number(form.get('days'))) ? Number(form.get('days')) : 7;

  if (!/^[a-z0-9-]+$/i.test(id)) {
    return json({ error: 'Invalid content ID' }, 400);
  }

  if (action === 'restore') {
    await database.prepare('DELETE FROM reports WHERE file_id = ?').bind(id).run();
    await database
      .prepare('UPDATE files SET report_count = 0, reported_at = NULL WHERE id = ?')
      .bind(id)
      .run();
  } else if (action === 'hide') {
    const now = Math.floor(Date.now() / 1000);
    await database
      .prepare('UPDATE files SET reported_at = COALESCE(reported_at, ?) WHERE id = ?')
      .bind(now, id)
      .run();
  } else {
    return json({ error: 'Unknown action' }, 400);
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: `/admin?lang=${lang}&days=${days}`,
      'Cache-Control': 'no-store',
    },
  });
}
