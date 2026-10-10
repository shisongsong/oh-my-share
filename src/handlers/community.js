import { BASE_CSS, renderNav, renderFooter, hreflangLinks } from '../ui/theme.js';
import { resolveLang, I18N } from '../i18n.js';
import { getDatabase, json } from '../security.js';
import { getCurrentUser, isSameOriginRequest } from '../auth.js';
import { escapeHtml, renderWorkCards, GALLERY_CSS } from './gallery.js';

const BASE_URL = 'https://openanthropic.com';

// ---------------------------------------------------------------------------
// APIs
// ---------------------------------------------------------------------------

export async function handleLikeApi(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return json({ error: 'Authentication required', code: 'errAuthRequired' }, 401, {
      'Cache-Control': 'no-store',
    });
  }
  if (!isSameOriginRequest(request)) {
    return json({ error: 'Invalid origin' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const fileId = String(body?.file_id || '').trim();
  if (!/^[a-z0-9-]{1,64}$/i.test(fileId)) {
    return json({ error: 'Invalid file id' }, 400);
  }

  const database = getDatabase(env);
  const file = await database
    .prepare(
      `SELECT id FROM files
       WHERE id = ? AND published_at > 0 AND encrypted = 0
         AND (password_hash IS NULL OR password_hash = '')
         AND reported_at IS NULL`
    )
    .bind(fileId)
    .first();
  if (!file) {
    return json({ error: 'Not found', code: 'errNotFound' }, 404);
  }

  const existing = await database
    .prepare('SELECT user_id FROM likes WHERE user_id = ? AND file_id = ?')
    .bind(user.id, fileId)
    .first();
  if (existing) {
    await database
      .prepare('DELETE FROM likes WHERE user_id = ? AND file_id = ?')
      .bind(user.id, fileId)
      .run();
  } else {
    await database
      .prepare('INSERT INTO likes (user_id, file_id, created_at) VALUES (?, ?, ?)')
      .bind(user.id, fileId, Math.floor(Date.now() / 1000))
      .run();
  }

  const countRow = await database
    .prepare('SELECT COUNT(*) AS n FROM likes WHERE file_id = ?')
    .bind(fileId)
    .first();
  return json(
    { liked: !existing, count: countRow?.n || 0 },
    200,
    { 'Cache-Control': 'no-store' }
  );
}

const NICK_FORBIDDEN = /[<>"'`\\]/g;
const NICK_ALLOWED = /^[\p{L}\p{N} _-]+$/u;

export async function handleProfileApi(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return json({ error: 'Authentication required', code: 'errAuthRequired' }, 401, {
      'Cache-Control': 'no-store',
    });
  }
  if (!isSameOriginRequest(request)) {
    return json({ error: 'Invalid origin' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const nickname = String(body?.nickname || '')
    .trim()
    .replace(NICK_FORBIDDEN, '')
    .replace(/\s+/g, ' ')
    .slice(0, 24);
  const bio = String(body?.bio || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 160);

  if (nickname.length < 2 || nickname.length > 24 || !NICK_ALLOWED.test(nickname)) {
    return json({ error: 'Nickname must be 2-24 letters, numbers, CJK, spaces, _ or -' }, 400);
  }

  const database = getDatabase(env);
  await database
    .prepare('UPDATE users SET nickname = ?, bio = ? WHERE id = ?')
    .bind(nickname, bio, user.id)
    .run();
  return json({ nickname, bio }, 200, { 'Cache-Control': 'no-store' });
}

// ---------------------------------------------------------------------------
// Avatar — deterministic identicon SVG derived from the user id (no storage)
// ---------------------------------------------------------------------------

function identiconSvg(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const hue = h % 360;
  const bg = `hsl(${hue} 60% 92%)`;
  const fg = `hsl(${hue} 65% 42%)`;
  const fg2 = `hsl(${(hue + 35) % 360} 70% 50%)`;

  let cells = '';
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const on = ((h >>> ((y + 1) * (x + 2))) ^ (h >>> (y + x + 3))) & 1;
      if (!on) continue;
      const color = (h >> ((x + 1) * (y + 1))) & 1 ? fg : fg2;
      cells += `<rect x="${x * 16}" y="${y * 16}" width="16" height="16" fill="${color}"/>`;
      if (x < 2) {
        cells += `<rect x="${(4 - x) * 16}" y="${y * 16}" width="16" height="16" fill="${color}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${bg}"/>${cells}</svg>`;
}

export function renderAvatarResponse(id) {
  return new Response(identiconSvg(id), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

// ---------------------------------------------------------------------------
// Profile page /u/:id
// ---------------------------------------------------------------------------

export async function handleProfilePage(request, env, userId) {
  const lang = resolveLang(request);
  const t = I18N[lang] || I18N.en;
  const url = new URL(request.url);
  const database = getDatabase(env);
  const now = Math.floor(Date.now() / 1000);

  const user = await database
    .prepare('SELECT id, email, nickname, bio, created_at FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    const { nav, footer } = profileChrome(lang, url.origin);
    return new Response(
      `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${escapeHtml(t.profileNotFound)} | Oh My Share</title>
<meta name="robots" content="noindex">
<style>${BASE_CSS}
.p-main { max-width: 1000px; margin: 0 auto; padding: 56px 20px; text-align: center; }
</style>
</head>
<body>
${nav}
<main class="p-main"><h1>${escapeHtml(t.profileNotFound)}</h1><p><a href="/gallery">${escapeHtml(t.profileBack)}</a></p></main>
${footer}
</body>
</html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const viewer = await getCurrentUser(request, env);
  const isSelf = Boolean(viewer && viewer.id === user.id);
  const displayName =
    user.nickname ||
    (isSelf
      ? user.email.split('@')[0]
      : `${t.userPrefix.replace('{n}', user.id.slice(0, 8))}`);

  const works = await database
    .prepare(
      `SELECT f.id, f.title, f.description, f.tags, f.filename, f.published_at, f.owner_id,
              u.nickname,
              (SELECT COUNT(*) FROM visits v WHERE v.file_id = f.id) AS views,
              (SELECT COUNT(*) FROM likes l WHERE l.file_id = f.id) AS likes
       FROM files f LEFT JOIN users u ON u.id = f.owner_id
       WHERE f.owner_id = ?
         AND f.published_at > 0
         AND f.encrypted = 0
         AND (f.password_hash IS NULL OR f.password_hash = '')
         AND (f.expires_at IS NULL OR f.expires_at = 0 OR f.expires_at > ?)
         AND f.reported_at IS NULL
       ORDER BY f.published_at DESC
       LIMIT 48`
    )
    .bind(user.id, now)
    .all();

  const items = works.results || [];
  const worksHtml = items.length
    ? `<div class="g-grid">\n${renderWorkCards(items, t)}\n    </div>`
    : `<div class="g-empty"><p>${escapeHtml(t.profileEmpty)}</p></div>`;

  const postsResult = await database
    .prepare(
      'SELECT id, title, content, created_at, comment_count FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 48'
    )
    .bind(user.id)
    .all();
  const postItems = postsResult.results || [];
  const postExcerpt = (text) => {
    const flat = String(text || '').replace(/\s+/g, ' ').trim();
    return flat.length > 140 ? `${flat.slice(0, 140)}…` : flat;
  };
  const postsHtml = postItems.length
    ? `<div class="p-posts">${postItems
        .map((p) => {
          const pdate = new Date(p.created_at * 1000).toISOString().slice(0, 10);
          return `<a class="p-post-row" href="/post/${encodeURIComponent(p.id)}">
          <span class="p-post-title">${escapeHtml(p.title || postExcerpt(p.content).slice(0, 40))}</span>
          <span class="p-post-meta">${escapeHtml(t.commentsLabel.replace('{n}', String(p.comment_count || 0)))} · ${pdate}</span>
        </a>`;
        })
        .join('')}</div>`
    : '';

  const joined = new Date(user.created_at * 1000).toISOString().slice(0, 10);
  const { nav, footer } = profileChrome(lang, url.origin);
  const esc = escapeHtml;

  const editForm = isSelf
    ? `<form class="p-edit" id="profileForm">
      <label>${esc(t.profileNick)}<input id="pNick" maxlength="24" value="${esc(user.nickname || '')}" placeholder="${esc(t.profileNick)}" required></label>
      <label>${esc(t.profileBio)}<textarea id="pBio" maxlength="160" placeholder="${esc(t.profileBio)}">${esc(user.bio || '')}</textarea></label>
      <div class="p-edit-row">
        <button class="btn" type="submit">${esc(t.profileSave)}</button>
        <span id="pMsg" class="p-msg"></span>
      </div>
    </form>
    <script>
    (function () {
      var form = document.getElementById('profileForm');
      if (!form) return;
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var msg = document.getElementById('pMsg');
        try {
          var res = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nickname: document.getElementById('pNick').value,
              bio: document.getElementById('pBio').value
            })
          });
          if (!res.ok) { msg.textContent = ${JSON.stringify(t.profileFail)}; return; }
          msg.textContent = ${JSON.stringify(t.profileSaved)};
        } catch (err) {
          msg.textContent = ${JSON.stringify(t.profileFail)};
        }
      });
    })();
    </script>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${esc(displayName)} | Oh My Share</title>
<meta name="description" content="${esc((user.bio || '').slice(0, 160) || `${displayName} on Oh My Share`)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url.origin}/u/${esc(user.id)}">
${hreflangLinks(url.origin, `/u/${user.id}`)}
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ProfilePage","mainEntity":{"@type":"Person","name":${JSON.stringify(displayName)},"url":"${url.origin}/u/${user.id}"}}
</script>
<meta property="og:site_name" content="Oh My Share">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(displayName)} | Oh My Share">
<meta property="og:url" content="${url.origin}/u/${esc(user.id)}">
<meta property="og:image" content="${url.origin}/avatar/${esc(user.id)}.svg">
<style>${BASE_CSS}
${GALLERY_CSS}
.p-head { max-width: 1000px; margin: 0 auto; padding: 44px 20px 8px; display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
.p-avatar { width: 76px; height: 76px; border-radius: 50%; border: 1px solid var(--color-hairline); background: #fff; flex: none; }
.p-info h1 { margin: 0 0 6px; font-size: 26px; }
.p-bio { margin: 0; color: var(--color-text-secondary); line-height: 1.6; max-width: 560px; }
.p-joined { margin: 10px 0 0; font-size: 13px; color: var(--color-text-tertiary); }
.p-works { max-width: 1000px; margin: 0 auto; padding: 18px 20px 64px; }
.p-works h2 { font-size: 18px; margin: 18px 0 14px; }
.p-edit { max-width: 460px; margin: 18px 0 4px; display: grid; gap: 10px; }
.p-edit label { display: grid; gap: 4px; font-size: 13px; color: var(--color-text-secondary); }
.p-edit input, .p-edit textarea {
  font: inherit; padding: 9px 12px; border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md, 10px); background: var(--color-surface, #fff); color: var(--color-text);
}
.p-edit textarea { min-height: 72px; resize: vertical; }
.p-edit-row { display: flex; align-items: center; gap: 10px; }
.p-msg { font-size: 13px; color: var(--color-text-secondary); }
.p-posts { display: grid; gap: 0; margin-bottom: 26px; }
.p-post-row {
  display: flex; align-items: baseline; justify-content: space-between; gap: 14px;
  padding: 11px 4px; border-bottom: 1px solid var(--color-hairline);
  text-decoration: none; color: inherit;
}
.p-post-row:hover .p-post-title { color: var(--color-accent-strong); }
.p-post-title { font-size: 14.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-post-meta { font-size: 12px; color: var(--color-text-tertiary); flex: none; }
</style>
</head>
<body>
${nav}
<main>
  <div class="p-head">
    <img class="p-avatar" src="/avatar/${esc(user.id)}.svg" alt="" width="76" height="76">
    <div class="p-info">
      <h1>${esc(displayName)}</h1>
      ${user.bio ? `<p class="p-bio">${esc(user.bio)}</p>` : ''}
      <p class="p-joined">${esc(t.profileJoined.replace('{n}', joined))}</p>
      ${editForm}
    </div>
  </div>
  <section class="p-works">
    ${postItems.length ? `<h2>${esc(t.profilePosts)} · ${postItems.length}</h2>${postsHtml}` : ''}
    <h2>${esc(t.profileWorks)} · ${items.length}</h2>
    ${worksHtml}
  </section>
</main>
${footer}
<script>
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
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function profileChrome(lang, origin) {
  const t = I18N[lang] || I18N.en;
  const other = lang === 'zh' ? 'en' : 'zh';
  const nav = renderNav(
    lang,
    '',
    `<a class="lang-switch" href="?lang=${other}">${other === 'zh' ? '中文' : 'EN'}</a>
     <a class="account-button" href="/">${escapeHtml(t.accountBtn)}</a>`
  );
  return { nav, footer: renderFooter(lang) };
}
