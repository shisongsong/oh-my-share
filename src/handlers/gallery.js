import { BASE_CSS, renderNav, renderFooter, hreflangLinks } from '../ui/theme.js';
import { resolveLang, I18N } from '../i18n.js';
import { getDatabase, getBucket, json } from '../security.js';
import { getCurrentUser } from '../auth.js';
import { renderPage } from '../ui/page.js';
import {
  fetchComments,
  renderCommentsSection,
  COMMENT_CSS,
  COMMUNITY_SCRIPT,
  DISC_CSS,
} from './posts.js';

export const GALLERY_CSS = `
.g-main { max-width: 1120px; margin: 0 auto; padding: 40px 20px 72px; }
.g-hero { text-align: center; margin-bottom: 32px; }
.g-hero h1 {
  font-size: clamp(28px, 5vw, 40px);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.g-hero p { color: var(--color-text-secondary); font-size: 15px; margin: 0 0 24px; }
.g-search { display: flex; gap: 8px; max-width: 560px; margin: 0 auto; }
.g-search input[type="search"] {
  flex: 1;
  padding: 11px 18px;
  font-size: 15px;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
}
.g-search input[type="search"]:focus { border-color: var(--color-accent-strong); box-shadow: var(--shadow-glow); }
.g-search button {
  padding: 11px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--gradient-primary);
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: filter var(--duration-fast) ease;
}
.g-search button:hover { filter: brightness(1.06); }
.g-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-hairline);
  padding-bottom: 12px;
}
.g-tab {
  padding: 7px 16px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  text-decoration: none;
  transition: background var(--duration-fast) ease;
}
.g-tab:hover { background: var(--color-fill); }
.g-tab.active {
  color: var(--color-text);
  background: var(--color-surface);
  border-color: var(--color-hairline-strong);
}
.g-count { margin-left: auto; font-size: 12.5px; color: var(--color-text-tertiary); }
.g-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}
.g-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  text-decoration: none;
  color: inherit;
  transition: box-shadow var(--duration-fast) ease, transform var(--duration-fast) ease, border-color var(--duration-fast) ease;
}
.g-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
  border-color: var(--color-hairline-strong);
}
.g-card-title {
  font-size: 15.5px;
  font-weight: 700;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.g-card-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.g-card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.g-card-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent-strong);
  background: rgba(255, 92, 124, 0.10);
  padding: 2px 9px;
  border-radius: var(--radius-pill);
}
.g-card-meta {
  display: flex;
  gap: 12px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--color-hairline);
  font-size: 11.5px;
  color: var(--color-text-tertiary);
}
.g-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 64px 16px;
  color: var(--color-text-secondary);
}
.g-empty p { margin: 0 0 16px; font-size: 15px; }
.g-empty a {
  display: inline-block;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--gradient-primary);
  border-radius: var(--radius-pill);
  text-decoration: none;
}
.g-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
}
.g-pager a, .g-pager span {
  padding: 8px 18px;
  font-size: 13.5px;
  font-weight: 600;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  text-decoration: none;
  color: var(--color-text);
  background: var(--color-surface);
}
.g-pager a:hover { background: var(--color-fill); }
.g-pager a.disabled { opacity: 0.4; pointer-events: none; }
.g-pager .g-pageinfo { border: none; background: transparent; color: var(--color-text-tertiary); }
@media (max-width: 640px) {
  .g-grid { grid-template-columns: 1fr; }
  .g-count { display: none; }
}
.g-detail { max-width: 960px; margin: 0 auto; padding: 40px 20px 72px; }
.g-detail-crumb { font-size: 13px; color: var(--color-text-tertiary); margin-bottom: 16px; }
.g-detail-crumb a { color: var(--color-text-tertiary); text-decoration: none; }
.g-detail-crumb a:hover { color: var(--color-accent-strong); }
.g-detail h1 {
  font-size: clamp(24px, 4vw, 34px);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
  word-break: break-word;
}
.g-detail-meta {
  display: flex; flex-wrap: wrap; gap: 14px; align-items: center;
  font-size: 13px; color: var(--color-text-tertiary);
  margin-bottom: 8px;
}
.g-detail-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
.g-detail-desc { font-size: 15px; line-height: 1.65; color: var(--color-text-secondary); margin: 0 0 24px; }
.g-detail-frame {
  width: 100%;
  height: 480px;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-card);
  background: #fff;
  margin-bottom: 20px;
}
.g-detail-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 32px; }
.g-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 11px 22px; font-size: 14px; font-weight: 600;
  border-radius: var(--radius-pill); text-decoration: none;
  border: 1px solid var(--color-hairline-strong);
  color: var(--color-text); background: var(--color-surface);
  transition: filter var(--duration-fast) ease, transform var(--duration-fast) ease;
}
.g-btn:hover { filter: brightness(0.97); transform: translateY(-1px); }
.g-btn.primary { color: #fff; background: var(--gradient-primary); border-color: transparent; }
.g-btn.danger { color: var(--color-accent-strong); }
.g-detail-note { font-size: 12.5px; color: var(--color-text-tertiary); margin-bottom: 32px; }
.g-card { display: block; position: relative; }
.g-card-title { display: block; }
.g-card-title::after { content: ''; position: absolute; inset: 0; }
.g-card-author {
  display: inline-flex; align-items: center; gap: 5px;
  position: relative; z-index: 2; color: inherit; text-decoration: none; font-size: 12.5px;
}
.g-card-author:hover span { text-decoration: underline; }
.g-card-author .g-avatar { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 1px solid var(--color-hairline); }
.g-like {
  position: relative; z-index: 2;
  display: inline-flex; align-items: center; gap: 4px;
  border: 1px solid var(--color-hairline-strong); background: var(--color-surface);
  border-radius: var(--radius-pill); padding: 2px 9px; margin-left: auto;
  font-size: 12px; color: var(--color-text-secondary); cursor: pointer; font-family: inherit;
}
.g-like:hover { border-color: #e25555; color: #e25555; }
.g-like.liked { color: #e25555; border-color: #e25555; }
@media (max-width: 640px) {
  .g-detail-frame { height: 360px; }
}
`;

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, key) => (key in values ? String(values[key]) : m));
}

export async function queryGallery(env, opts = {}) {
  // LIKE pattern `%q%` must stay within D1's 50-byte LIKE limit
  let q = (opts.q || '').trim().slice(0, 64);
  while (q.length > 0 && new TextEncoder().encode(`%${q}%`).length > 50) {
    q = q.slice(0, -1);
  }

  const sort = opts.sort === 'hot' ? 'hot' : 'new';
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const perPage = Math.min(50, Math.max(1, parseInt(opts.perPage, 10) || 24));
  const now = Math.floor(Date.now() / 1000);

  const conditions = [
    'f.published_at > 0',
    'f.encrypted = 0',
    "(f.password_hash IS NULL OR f.password_hash = '')",
    '(f.expires_at IS NULL OR f.expires_at = 0 OR f.expires_at > ?)',
    'f.reported_at IS NULL',
  ];
  const params = [now];
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    conditions.push(
      `(f.title LIKE ? ESCAPE '\\' OR f.description LIKE ? ESCAPE '\\' OR f.tags LIKE ? ESCAPE '\\' OR f.id LIKE ? ESCAPE '\\')`
    );
    params.push(pattern, pattern, pattern, pattern);
  }
  const where = conditions.join(' AND ');

  const database = getDatabase(env);
  const totalRow = await database
    .prepare(`SELECT COUNT(*) AS total FROM files f WHERE ${where}`)
    .bind(...params)
    .first();
  const total = totalRow?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);

  const order =
    sort === 'hot'
      ? '(SELECT COUNT(*) FROM likes l WHERE l.file_id = f.id) DESC, (SELECT COUNT(*) FROM visits v WHERE v.file_id = f.id) DESC, f.published_at DESC'
      : 'f.published_at DESC, f.id DESC';

  const result = await database
    .prepare(
      `SELECT f.id, f.title, f.description, f.tags, f.filename, f.published_at, f.owner_id,
              u.nickname,
              (SELECT COUNT(*) FROM visits v WHERE v.file_id = f.id) AS views,
              (SELECT COUNT(*) FROM likes l WHERE l.file_id = f.id) AS likes
       FROM files f LEFT JOIN users u ON u.id = f.owner_id
       WHERE ${where}
       ORDER BY ${order}
       LIMIT ? OFFSET ?`
    )
    .bind(...params, perPage, (safePage - 1) * perPage)
    .all();

  return {
    items: result.results || [],
    total,
    page: safePage,
    pages: totalPages,
    q,
    sort,
  };
}

// Community work card: title link covers the card, author links to /u/:id and
// the like button sits above the stretched link.
export function renderWorkCards(items, t) {
  return items
    .map((item) => {
      const title = item.title || item.filename || item.id;
      const tags = (item.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((tag) => `<span class="g-card-tag">${escapeHtml(tag)}</span>`)
        .join('');
      const date = item.published_at
        ? new Date(item.published_at * 1000).toISOString().slice(0, 10)
        : '';
      const authorHtml = item.owner_id
        ? `<a class="g-card-author" href="/u/${encodeURIComponent(item.owner_id)}"><img class="g-avatar" src="/avatar/${encodeURIComponent(item.owner_id)}.svg" alt="" width="18" height="18"><span>${escapeHtml(item.nickname || fill(t.userPrefix, { n: item.owner_id.slice(0, 8) }))}</span></a>`
        : `<span class="g-card-author g-card-anon">${escapeHtml(fill(t.galleryAuthor, { n: t.communityAnon }))}</span>`;
      const likes = item.likes || 0;
      return `      <div class="g-card">
        <a class="g-card-title" href="/gallery/${encodeURIComponent(item.id)}">${escapeHtml(title)}</a>
        ${item.description ? `<p class="g-card-desc">${escapeHtml(item.description)}</p>` : ''}
        ${tags ? `<div class="g-card-tags">${tags}</div>` : ''}
        <div class="g-card-meta">
          ${authorHtml}
          <span>${escapeHtml(fill(t.galleryViews, { n: item.views }))}</span>
          <button type="button" class="g-like" data-file="${escapeHtml(item.id)}" title="${escapeHtml(t.likesTitle)}" aria-label="${escapeHtml(t.likesTitle)}"><span class="g-like-heart">♥</span><span class="g-like-count">${likes}</span></button>
          <span>${date}</span>
        </div>
      </div>`;
    })
    .join('\n');
}

// Delegated like-toggle behaviour for community pages (gallery + profiles).
export const LIKE_SCRIPT = `
document.addEventListener('click', async function (e) {
  var btn = e.target.closest('.g-like');
  if (!btn) return;
  e.preventDefault();
  try {
    var res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: btn.dataset.file })
    });
    if (res.status === 401) { location.href = '/'; return; }
    if (!res.ok) return;
    var data = await res.json();
    btn.classList.toggle('liked', !!data.liked);
    var count = btn.querySelector('.g-like-count');
    if (count) count.textContent = String(data.count);
  } catch (err) {}
});
`;

export async function handleGalleryPage(request, env) {
  const lang = resolveLang(request);
  const t = I18N[lang] || I18N.en;
  const url = new URL(request.url);

  const { items, total, page: safePage, pages: totalPages, q, sort } = await queryGallery(env, {
    q: url.searchParams.get('q'),
    sort: url.searchParams.get('sort'),
    page: url.searchParams.get('page'),
    perPage: 24,
  });

  const cards = renderWorkCards(items, t);

  let itemsHtml;
  if (items.length > 0) {
    itemsHtml = `<div class="g-grid">\n${cards}\n    </div>`;
  } else if (q) {
    itemsHtml = `<div class="g-grid"><div class="g-empty"><p>${escapeHtml(t.galleryNoResults)}</p></div></div>`;
  } else {
    itemsHtml = `<div class="g-grid"><div class="g-empty"><p>${escapeHtml(t.galleryEmpty)}</p><a href="/">${escapeHtml(t.galleryEmptyCta)}</a></div></div>`;
  }

  const pager = [];
  const paramsFor = (nextPage) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    p.set('sort', sort);
    if (nextPage > 1) p.set('page', String(nextPage));
    return `/gallery?${p.toString()}`;
  };
  if (safePage > 1) {
    pager.push(`<a href="${paramsFor(safePage - 1)}">‹ ${escapeHtml(t.galleryPrev)}</a>`);
  }
  pager.push(
    `<span class="g-pageinfo">${escapeHtml(fill(t.galleryPageInfo, { n: safePage, m: totalPages }))}</span>`
  );
  if (safePage < totalPages) {
    pager.push(`<a href="${paramsFor(safePage + 1)}">${escapeHtml(t.galleryNext)} ›</a>`);
  }
  const pagerHtml = totalPages > 1 ? `<nav class="g-pager">${pager.join('')}</nav>` : '';

  const altLang = lang === 'zh' ? 'en' : 'zh';
  const langParams = new URLSearchParams();
  if (q) langParams.set('q', q);
  langParams.set('sort', sort);
  if (safePage > 1) langParams.set('page', String(safePage));
  langParams.set('lang', altLang);

  const nav = renderNav(
    lang,
    '/gallery',
    `<a class="lang-switch" id="langBtn" href="/gallery?${langParams.toString()}">${altLang === 'zh' ? '中文' : 'EN'}</a>
      <a class="account-button" id="accountBtn" href="/">${escapeHtml(t.accountBtn)}</a>`
  );

  const tabHref = (targetSort) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    p.set('sort', targetSort);
    return `/gallery?${p.toString()}`;
  };

  const html = `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${escapeHtml(t.galleryTitle)}</title>
<meta name="description" content="${escapeHtml(t.galleryMetaDesc)}">
${q ? '<meta name="robots" content="noindex,follow">' : ''}
<link rel="canonical" href="${url.origin}/gallery">
${q ? '' : hreflangLinks(url.origin, '/gallery')}
${q ? '' : `<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CollectionPage","name":${JSON.stringify(t.galleryTitle)},"description":${JSON.stringify(t.galleryMetaDesc)},"url":"${url.origin}/gallery","isPartOf":{"@type":"WebSite","name":"Oh My Share","url":"${url.origin}"}}
</script>`}
<meta property="og:site_name" content="Oh My Share">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(t.galleryTitle)}">
<meta property="og:description" content="${escapeHtml(t.galleryMetaDesc)}">
<meta property="og:url" content="${url.origin}/gallery">
<meta property="og:image" content="${url.origin}/og-image.png">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(t.galleryTitle)}">
<meta name="twitter:description" content="${escapeHtml(t.galleryMetaDesc)}">
<meta name="twitter:image" content="${url.origin}/og-image.png">
<style>
${BASE_CSS}
${GALLERY_CSS}
${DISC_CSS}
</style>
</head>
<body>
${nav}
<main class="g-main">
  <header class="g-hero">
    <h1>${escapeHtml(t.galleryH1)}</h1>
    <p>${escapeHtml(t.gallerySubtitle)}</p>
    <nav class="seg-tabs">
      <a href="/community">${escapeHtml(t.tabDiscussions)}</a>
      <a class="active" href="/gallery">${escapeHtml(t.tabWorks)}</a>
    </nav>
    <form class="g-search" action="/gallery" method="get">
      <input type="hidden" name="sort" value="${sort}">
      <input type="search" name="q" value="${escapeHtml(q)}" placeholder="${escapeHtml(t.gallerySearchPlaceholder)}" maxlength="40">
      <button type="submit">${escapeHtml(t.gallerySearchBtn)}</button>
    </form>
  </header>
  <nav class="g-tabs">
    <a class="g-tab${sort === 'new' ? ' active' : ''}" href="${tabHref('new')}">${escapeHtml(t.gallerySortNew)}</a>
    <a class="g-tab${sort === 'hot' ? ' active' : ''}" href="${tabHref('hot')}">${escapeHtml(t.gallerySortHot)}</a>
    <span class="g-count">${escapeHtml(fill(t.galleryCount, { n: total }))}</span>
  </nav>
  ${itemsHtml}
  ${pagerHtml}
</main>
${renderFooter(lang)}
<script>${LIKE_SCRIPT}</script>
</body>
</html>`;

  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
    Vary: 'Accept-Language, Cookie',
  };
  if (q) headers['X-Robots-Tag'] = 'noindex, follow';

  return new Response(html, { headers });
}

function splitTags(raw) {
  return String(raw || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function getPublishedItem(database, id, now) {
  return database
    .prepare(
      `SELECT f.id, f.title, f.description, f.tags, f.filename, f.created_at, f.published_at, f.owner_id, f.remixed_from,
              u.nickname,
              (SELECT COUNT(*) FROM visits v WHERE v.file_id = f.id) AS views,
              (SELECT COUNT(*) FROM likes l WHERE l.file_id = f.id) AS likes
       FROM files f LEFT JOIN users u ON u.id = f.owner_id
       WHERE f.id = ?
         AND f.published_at > 0
         AND f.encrypted = 0
         AND (f.password_hash IS NULL OR f.password_hash = '')
         AND (f.expires_at IS NULL OR f.expires_at = 0 OR f.expires_at > ?)
         AND f.reported_at IS NULL`
    )
    .bind(id, now)
    .first();
}

const DETAIL_CSS_EXTRA = '';

export async function handleGalleryItem(request, env, id) {
  if (!id || !/^[a-z0-9-]{1,64}$/i.test(id)) {
    return new Response('Invalid ID', { status: 400 });
  }

  const lang = resolveLang(request);
  const t = I18N[lang] || I18N.en;
  const database = getDatabase(env);
  if (!database) return new Response('Service unavailable', { status: 503 });

  const now = Math.floor(Date.now() / 1000);
  const item = await getPublishedItem(database, id, now);
  if (!item) return new Response('Not Found', { status: 404 });

  const url = new URL(request.url);
  const title = item.title || item.filename || item.id;
  const desc = item.description || '';
  const tags = splitTags(item.tags).slice(0, 8);
  const date = item.published_at
    ? new Date(item.published_at * 1000).toISOString().slice(0, 10)
    : '';
  const viewer = await getCurrentUser(request, env);
  const comments = await fetchComments(env, 'work', id);

  const tagsHtml = tags
    .map((tag) => `<span class="g-card-tag">${escapeHtml(tag)}</span>`)
    .join('');

  let remixLine = '';
  if (item.remixed_from) {
    const source = await database
      .prepare('SELECT id, title, filename FROM files WHERE id = ? AND published_at > 0 AND reported_at IS NULL')
      .bind(item.remixed_from)
      .first();
    const label = escapeHtml(fill(t.galleryRemixedFrom, { n: '' }));
    if (source) {
      const sourceTitle = source.title || source.filename || source.id;
      remixLine = `<span>${label} <a href="/gallery/${encodeURIComponent(source.id)}" style="color:var(--color-accent-strong);font-weight:600;">${escapeHtml(sourceTitle)}</a></span>`;
    } else {
      remixLine = `<span>${label}${escapeHtml(item.remixed_from.slice(0, 8))}</span>`;
    }
  }

  const altLang = lang === 'zh' ? 'en' : 'zh';
  const nav = renderNav(
    lang,
    '/gallery',
    `<a class="lang-switch" href="/gallery/${encodeURIComponent(id)}?lang=${altLang}">${altLang === 'zh' ? '中文' : 'EN'}</a>
      <a class="account-button" href="/">${escapeHtml(t.accountBtn)}</a>`
  );

  const canonical = `${url.origin}/gallery/${id}`;
  const escTitle = escapeHtml(title);
  const escDesc = escapeHtml(desc);

  const html = `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${escTitle} | Oh My Share</title>
${desc ? `<meta name="description" content="${escDesc}">` : ''}
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
${hreflangLinks(url.origin, `/gallery/${encodeURIComponent(id)}`)}
<meta property="og:title" content="${escTitle}">
${desc ? `<meta property="og:description" content="${escDesc}">` : ''}
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${url.origin}/og-image.png">
<meta property="og:site_name" content="Oh My Share">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escTitle}">
${desc ? `<meta name="twitter:description" content="${escDesc}">` : ''}
<meta name="twitter:image" content="${url.origin}/og-image.png">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": ${JSON.stringify(title)},
  ${desc ? `"description": ${JSON.stringify(desc)},` : ''}
  "url": ${JSON.stringify(canonical)},
  "datePublished": ${JSON.stringify(date)},
  "isAccessibleForFree": true
}
</script>
<style>
${BASE_CSS}
${GALLERY_CSS}
${COMMENT_CSS}
${DETAIL_CSS_EXTRA}
</style>
</head>
<body>
${nav}
<main class="g-detail">
  <div class="g-detail-crumb"><a href="/gallery">${escapeHtml(t.galleryH1)}</a> /</div>
  <h1>${escTitle}</h1>
  <div class="g-detail-meta">
    ${item.owner_id
      ? `<a class="g-card-author" href="/u/${encodeURIComponent(item.owner_id)}" style="color:inherit"><img class="g-avatar" src="/avatar/${encodeURIComponent(item.owner_id)}.svg" alt="" width="18" height="18"><span>${escapeHtml(item.nickname || fill(t.userPrefix, { n: item.owner_id.slice(0, 8) }))}</span></a>`
      : `<span>${escapeHtml(fill(t.galleryAuthor, { n: id.slice(0, 8) }))}</span>`}
    <span>${escapeHtml(fill(t.galleryViews, { n: item.views }))}</span>
    <button type="button" class="g-like" data-file="${escapeHtml(item.id)}" title="${escapeHtml(t.likesTitle)}" aria-label="${escapeHtml(t.likesTitle)}"><span class="g-like-heart">♥</span><span class="g-like-count">${item.likes || 0}</span></button>
    ${date ? `<span>${escapeHtml(fill(t.galleryPublishedOn, { n: date }))}</span>` : ''}
    ${remixLine}
  </div>
  ${tagsHtml ? `<div class="g-detail-tags">${tagsHtml}</div>` : ''}
  ${desc ? `<p class="g-detail-desc">${escDesc}</p>` : ''}
  <iframe class="g-detail-frame" src="/view/${encodeURIComponent(id)}" sandbox="allow-scripts allow-forms allow-popups allow-modals" loading="lazy" title="${escTitle}"></iframe>
  <p class="g-detail-note">${escapeHtml(t.galleryPreviewNote)}</p>
  <div class="g-detail-actions">
    <a class="g-btn primary" href="/view/${encodeURIComponent(id)}" target="_blank" rel="noopener">${escapeHtml(t.galleryOpen)} ↗</a>
    <a class="g-btn" href="/remix/${encodeURIComponent(id)}">${escapeHtml(t.galleryRemix)}</a>
    <a class="g-btn danger" href="/abuse?id=${encodeURIComponent(id)}">${escapeHtml(t.galleryReport)}</a>
  </div>
${renderCommentsSection(comments, t, { viewerId: viewer ? viewer.id : null, targetType: 'work', targetId: id })}
</main>
${renderFooter(lang)}
<script>${COMMUNITY_SCRIPT}</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      Vary: 'Accept-Language, Cookie',
    },
  });
}

export async function handleGalleryApi(request, env) {
  const url = new URL(request.url);
  const data = await queryGallery(env, {
    q: url.searchParams.get('q'),
    sort: url.searchParams.get('sort'),
    page: url.searchParams.get('page'),
    perPage: url.searchParams.get('limit') || 24,
  });

  return json(
    {
      items: data.items.map((item) => ({
        id: item.id,
        title: item.title || item.filename || item.id,
        description: item.description || '',
        tags: splitTags(item.tags),
        views: item.views,
        published_at: item.published_at,
        url: `${url.origin}/view/${item.id}`,
        detail_url: `${url.origin}/gallery/${item.id}`,
        remix_url: `${url.origin}/remix/${item.id}`,
      })),
      total: data.total,
      page: data.page,
      pages: data.pages,
      q: data.q,
      sort: data.sort,
    },
    200,
    {
      'Cache-Control': 'public, max-age=30',
      'Access-Control-Allow-Origin': '*',
    }
  );
}

export async function handleRemixPage(request, env, id) {
  if (!id || !/^[a-z0-9-]{1,64}$/i.test(id)) {
    return new Response('Invalid ID', { status: 400 });
  }

  const lang = resolveLang(request);
  const database = getDatabase(env);
  if (!database) return new Response('Service unavailable', { status: 503 });

  const now = Math.floor(Date.now() / 1000);
  const item = await getPublishedItem(database, id, now);
  if (!item) return new Response('Not Found', { status: 404 });

  const bucket = getBucket(env);
  const object = await bucket.get(id);
  if (!object) return new Response('Not Found', { status: 404 });
  const code = await object.text();

  const MAX_REMIX_BYTES = 1024 * 1024;
  if (new TextEncoder().encode(code).byteLength > MAX_REMIX_BYTES) {
    return json({ error: 'Content too large to remix' }, 413);
  }

  const html = renderPage(lang, {
    id: item.id,
    title: item.title || item.filename || '',
    code,
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
      Vary: 'Accept-Language, Cookie',
    },
  });
}
