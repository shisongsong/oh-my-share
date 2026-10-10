import { getDatabase, json, checkRateLimit } from '../security.js';
import { getCurrentUser, isSameOriginRequest } from '../auth.js';
import { resolveLang, I18N } from '../i18n.js';
import { escapeHtml, GALLERY_CSS, renderWorkCards } from './gallery.js';
import { BASE_CSS, renderNav, renderFooter, hreflangLinks } from '../ui/theme.js';

const LIMITS = { title: 100, content: 4000, comment: 1000 };

function newId() {
  return crypto.randomUUID();
}

function displayName(user, t, isSelf) {
  if (user.nickname) return user.nickname;
  if (isSelf) return user.email.split('@')[0];
  return t.userPrefix.replace('{n}', String(user.id).slice(0, 8));
}

function plainText(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function excerpt(text, max = 160) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function stripControl(value) {
  let out = '';
  for (const ch of String(value || '')) {
    const code = ch.codePointAt(0);
    if (code < 32 && ch !== '\n' && ch !== '\r' && ch !== '\t') continue;
    if (code === 127) continue;
    out += ch;
  }
  return out;
}

// ---------------------------------------------------------------------------
// APIs
// ---------------------------------------------------------------------------

async function authGuard(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return {
      error: json({ error: 'Authentication required', code: 'errAuthRequired' }, 401, {
        'Cache-Control': 'no-store',
      }),
    };
  }
  if (!isSameOriginRequest(request)) {
    return { error: json({ error: 'Invalid origin' }, 403) };
  }
  return { user };
}

async function readJson(request) {
  try {
    return { body: await request.json() };
  } catch {
    return { error: json({ error: 'Invalid JSON body' }, 400) };
  }
}

export async function handleCreatePost(request, env) {
  const auth = await authGuard(request, env);
  if (auth.error) return auth.error;
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { body } = parsed;

  const rate = await checkRateLimit(env, auth.user.id, 'post-h', 10, 3600);
  if (!rate.allowed) {
    return json({ error: 'Posting too often — try again later', code: 'errRateLimited' }, 429, {
      'Retry-After': String(rate.retryAfter),
    });
  }

  const title = stripControl(body?.title)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, LIMITS.title);
  const content = stripControl(body?.content).trim().slice(0, LIMITS.content);
  if (!content) return json({ error: 'Content is required' }, 400);
  if (!title && content.length < 10) {
    return json({ error: 'Tell us a little more (10+ characters)' }, 400);
  }

  let workId = body?.work_id ? String(body.work_id).trim() : '';
  if (workId) {
    if (!/^[a-z0-9-]{1,64}$/i.test(workId)) return json({ error: 'Invalid work id' }, 400);
    const owned = await getDatabase(env)
      .prepare('SELECT id FROM files WHERE id = ? AND owner_id = ? AND published_at > 0')
      .bind(workId, auth.user.id)
      .first();
    if (!owned) return json({ error: 'Work not found or not yours' }, 404);
  } else {
    workId = null;
  }

  const id = newId();
  const now = Math.floor(Date.now() / 1000);
  await getDatabase(env)
    .prepare(
      'INSERT INTO posts (id, user_id, title, content, work_id, created_at, comment_count) VALUES (?, ?, ?, ?, ?, ?, 0)'
    )
    .bind(id, auth.user.id, title, content, workId, now)
    .run();
  return json({ id }, 201, { 'Cache-Control': 'no-store' });
}

export async function handleDeletePost(request, env, id) {
  const auth = await authGuard(request, env);
  if (auth.error) return auth.error;
  if (!/^[a-z0-9-]{1,64}$/i.test(id)) return json({ error: 'Invalid post id' }, 400);
  const database = getDatabase(env);
  const post = await database
    .prepare('SELECT id, user_id FROM posts WHERE id = ?')
    .bind(id)
    .first();
  if (!post) return json({ error: 'Not found', code: 'errNotFound' }, 404);
  if (post.user_id !== auth.user.id) {
    return json({ error: 'Not your post', code: 'errForbidden' }, 403);
  }
  await database
    .prepare("DELETE FROM comments WHERE target_type = 'post' AND target_id = ?")
    .bind(id)
    .run();
  await database.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
  return json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
}

export async function handleCreateComment(request, env) {
  const auth = await authGuard(request, env);
  if (auth.error) return auth.error;
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { body } = parsed;

  const rate = await checkRateLimit(env, auth.user.id, 'cmt-h', 30, 3600);
  if (!rate.allowed) {
    return json({ error: 'Commenting too often — try again later', code: 'errRateLimited' }, 429, {
      'Retry-After': String(rate.retryAfter),
    });
  }

  const targetType = String(body?.target_type || '');
  const targetId = String(body?.target_id || '').trim();
  const content = stripControl(body?.content).trim().slice(0, LIMITS.comment);
  const parentId = body?.parent_id ? String(body.parent_id).trim() : null;

  if (!['post', 'work'].includes(targetType)) return json({ error: 'Invalid target type' }, 400);
  if (!/^[a-z0-9-]{1,64}$/i.test(targetId)) return json({ error: 'Invalid target id' }, 400);
  if (parentId && !/^[a-z0-9-]{1,64}$/i.test(parentId)) {
    return json({ error: 'Invalid parent id' }, 400);
  }
  if (!content) return json({ error: 'Comment cannot be empty' }, 400);

  const database = getDatabase(env);
  if (targetType === 'post') {
    const post = await database.prepare('SELECT id FROM posts WHERE id = ?').bind(targetId).first();
    if (!post) return json({ error: 'Post not found', code: 'errNotFound' }, 404);
  } else {
    const work = await database
      .prepare('SELECT id FROM files WHERE id = ? AND published_at > 0 AND reported_at IS NULL')
      .bind(targetId)
      .first();
    if (!work) return json({ error: 'Work not found', code: 'errNotFound' }, 404);
  }
  if (parentId) {
    const parent = await database
      .prepare('SELECT id FROM comments WHERE id = ? AND target_type = ? AND target_id = ?')
      .bind(parentId, targetType, targetId)
      .first();
    if (!parent) return json({ error: 'Parent comment not found' }, 404);
  }

  const id = newId();
  const now = Math.floor(Date.now() / 1000);
  await database
    .prepare(
      'INSERT INTO comments (id, user_id, target_type, target_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, auth.user.id, targetType, targetId, parentId, content, now)
    .run();
  if (targetType === 'post') {
    await database
      .prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?')
      .bind(targetId)
      .run();
  }
  return json({ id, created_at: now }, 201, { 'Cache-Control': 'no-store' });
}

export async function handleDeleteComment(request, env, id) {
  const auth = await authGuard(request, env);
  if (auth.error) return auth.error;
  if (!/^[a-z0-9-]{1,64}$/i.test(id)) return json({ error: 'Invalid comment id' }, 400);
  const database = getDatabase(env);
  const comment = await database
    .prepare('SELECT id, user_id, target_type, target_id FROM comments WHERE id = ?')
    .bind(id)
    .first();
  if (!comment) return json({ error: 'Not found', code: 'errNotFound' }, 404);
  if (comment.user_id !== auth.user.id) {
    return json({ error: 'Not your comment', code: 'errForbidden' }, 403);
  }
  await database.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
  if (comment.target_type === 'post') {
    await database
      .prepare(
        'UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE target_type = ? AND target_id = ?) WHERE id = ?'
      )
      .bind('post', comment.target_id, comment.target_id)
      .run();
  }
  return json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
}

// ---------------------------------------------------------------------------
// Discussion list (posts only)
// ---------------------------------------------------------------------------

export async function queryPosts(env, opts = {}) {
  let q = (opts.q || '').trim().slice(0, 64);
  while (q.length > 0 && new TextEncoder().encode(`%${q}%`).length > 50) {
    q = q.slice(0, -1);
  }
  const sort = opts.sort === 'hot' ? 'hot' : 'new';
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const perPage = Math.min(50, Math.max(1, parseInt(opts.perPage, 10) || 20));

  const escLike = (v) => v.replace(/[\\%_]/g, (m) => `\\${m}`);
  const conds = ['1 = 1'];
  const params = [];
  if (q) {
    const pattern = `%${escLike(q)}%`;
    conds.push(`(p.title LIKE ? ESCAPE '\\' OR p.content LIKE ? ESCAPE '\\')`);
    params.push(pattern, pattern);
  }
  const where = conds.join(' AND ');

  const totalRow = await getDatabase(env)
    .prepare(`SELECT COUNT(*) AS total FROM posts p WHERE ${where}`)
    .bind(...params)
    .first();
  const total = totalRow?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const order =
    sort === 'hot'
      ? 'p.comment_count DESC, p.created_at DESC'
      : 'p.created_at DESC, p.id DESC';

  const result = await getDatabase(env)
    .prepare(
      `SELECT p.id, p.title, p.content, p.created_at, p.comment_count, p.user_id, u.nickname
       FROM posts p LEFT JOIN users u ON u.id = p.user_id
       WHERE ${where}
       ORDER BY ${order}
       LIMIT ? OFFSET ?`
    )
    .bind(...params, perPage, (safePage - 1) * perPage)
    .all();
  return { items: result.results || [], total, page: safePage, pages: totalPages, q, sort };
}

// ---------------------------------------------------------------------------
// Rendering — discussion list
// ---------------------------------------------------------------------------

export const DISC_CSS = `
.d-main { max-width: 760px; margin: 0 auto; padding: 40px 20px 72px; }
.d-hero { text-align: center; margin-bottom: 26px; }
.d-hero h1 {
  font-size: clamp(28px, 5vw, 38px);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.d-hero p { color: var(--color-text-secondary); font-size: 14.5px; margin: 0 0 20px; }
.seg-tabs {
  display: inline-flex; gap: 4px; padding: 4px; margin: 0 auto 18px;
  background: var(--color-surface); border: 1px solid var(--color-hairline);
  border-radius: 999px;
}
.seg-tabs a {
  padding: 6px 16px; font-size: 13px; font-weight: 600; border-radius: 999px;
  color: var(--color-text-secondary); text-decoration: none;
}
.seg-tabs a:hover { background: var(--color-fill); }
.seg-tabs a.active { background: var(--color-fill); color: var(--color-text); }
.d-search { display: flex; gap: 8px; max-width: 480px; margin: 0 auto 22px; }
.d-search input[type="search"] {
  flex: 1; padding: 10px 16px; font-size: 14px;
  border: 1px solid var(--color-hairline-strong); border-radius: 999px;
  background: var(--color-surface); color: var(--color-text); outline: none;
}
.d-search input[type="search"]:focus { border-color: var(--color-accent-strong); box-shadow: var(--shadow-glow); }
.d-search button {
  padding: 10px 20px; font-size: 13.5px; font-weight: 600; color: #fff;
  background: var(--gradient-primary); border: none; border-radius: 999px; cursor: pointer;
}
.d-composer {
  display: flex; gap: 14px; padding: 18px;
  background: var(--color-surface); border: 1px solid var(--color-hairline);
  border-radius: 16px; margin-bottom: 24px;
}
.d-composer > .g-avatar { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--color-hairline); background: #fff; flex: none; }
.d-composer-body { flex: 1; display: grid; gap: 8px; min-width: 0; }
.d-composer input, .d-composer textarea {
  font: inherit; border: none; background: transparent; color: var(--color-text);
  outline: none; padding: 4px 0; resize: none; width: 100%;
}
.d-composer input { font-size: 16px; font-weight: 600; }
.d-composer input::placeholder, .d-composer textarea::placeholder { color: var(--color-text-tertiary); font-weight: 400; }
.d-composer textarea { min-height: 64px; font-size: 14.5px; line-height: 1.6; }
.d-composer-foot { display: flex; justify-content: flex-end; align-items: center; gap: 10px; }
.d-composer-hint { font-size: 12px; color: var(--color-text-tertiary); margin-right: auto; }
.d-cta {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 22px; margin-bottom: 24px; font-size: 14.5px; color: var(--color-text-secondary);
  background: var(--color-surface); border: 1px dashed var(--color-hairline-strong); border-radius: 16px;
}
.d-cta a { color: var(--color-text); font-weight: 600; }
.d-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.d-bar .g-tab {
  padding: 6px 14px; font-size: 13px; font-weight: 600; color: var(--color-text-secondary);
  border-radius: 999px; text-decoration: none; border: 1px solid transparent;
}
.d-bar .g-tab:hover { background: var(--color-fill); }
.d-bar .g-tab.active { color: var(--color-text); background: var(--color-surface); border-color: var(--color-hairline-strong); }
.d-count { margin-left: auto; font-size: 12.5px; color: var(--color-text-tertiary); }
.d-list { display: grid; gap: 12px; }
.d-item {
  position: relative;
  display: flex; gap: 14px; padding: 18px 20px;
  background: var(--color-surface); border: 1px solid var(--color-hairline);
  border-radius: 16px; color: inherit;
  transition: box-shadow var(--duration-fast) ease, transform var(--duration-fast) ease, border-color var(--duration-fast) ease;
}
.d-item:hover {
  box-shadow: var(--shadow-card-hover); transform: translateY(-2px);
  border-color: var(--color-hairline-strong);
}
.d-item > .g-avatar { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--color-hairline); background: #fff; flex: none; }
.d-body { flex: 1; min-width: 0; display: grid; gap: 5px; }
.d-title {
  font-size: 16px; font-weight: 700; color: var(--color-text); line-height: 1.35;
  text-decoration: none;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.d-title::after { content: ''; position: absolute; inset: 0; border-radius: 16px; }
.d-excerpt {
  font-size: 13.5px; line-height: 1.55; color: var(--color-text-secondary); margin: 0;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.d-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 12.5px; color: var(--color-text-tertiary); margin-top: 3px; position: relative; z-index: 1; }
.d-meta a { color: var(--color-text-secondary); font-weight: 600; text-decoration: none; position: relative; z-index: 1; }
.d-meta a:hover { color: var(--color-text); text-decoration: underline; }
.d-meta .meta-avatar { width: 16px; height: 16px; border-radius: 50%; vertical-align: -3px; margin-right: 4px; border: 1px solid var(--color-hairline); background: #fff; }
.d-empty {
  text-align: center; padding: 64px 16px; color: var(--color-text-secondary);
  background: var(--color-surface); border: 1px dashed var(--color-hairline-strong); border-radius: 16px;
}
.d-empty p { margin: 0 0 6px; font-size: 15px; }
.d-pager {
  display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 28px;
}
.d-pager a, .d-pager span {
  padding: 8px 18px; font-size: 13.5px; font-weight: 600;
  border: 1px solid var(--color-hairline-strong); border-radius: 999px;
  text-decoration: none; color: var(--color-text); background: var(--color-surface);
}
.d-pager a:hover { background: var(--color-fill); }
.d-pager .d-pageinfo { border: none; background: transparent; color: var(--color-text-tertiary); }
@media (max-width: 640px) {
  .d-composer { padding: 14px; }
  .d-item { padding: 14px 16px; }
}
`;

export function renderPostRows(items, t) {
  return items
    .map((p) => {
      const name = p.nickname || t.userPrefix.replace('{n}', String(p.user_id || '').slice(0, 8));
      const date = new Date(p.created_at * 1000).toISOString().slice(0, 10);
      const flat = String(p.content || '').replace(/\s+/g, ' ').trim();
      const excerptText = flat.length > 180 ? `${flat.slice(0, 180)}…` : flat;
      return `    <div class="d-item">
      <img class="g-avatar" src="/avatar/${encodeURIComponent(p.user_id)}.svg" alt="" width="40" height="40">
      <div class="d-body">
        <a class="d-title" href="/post/${encodeURIComponent(p.id)}">${escapeHtml(p.title || excerptText.slice(0, 40))}</a>
        <p class="d-excerpt">${escapeHtml(excerptText)}</p>
        <div class="d-meta">
          <span><img class="meta-avatar" src="/avatar/${encodeURIComponent(p.user_id)}.svg" alt="" width="16" height="16"><a href="/u/${encodeURIComponent(p.user_id)}">${escapeHtml(name)}</a></span>
          <span>${date}</span>
          <span>${escapeHtml(t.commentsLabel.replace('{n}', String(p.comment_count || 0)))}</span>
        </div>
      </div>
    </div>`;
    })
    .join('\n');
}

export async function fetchComments(env, targetType, targetId) {
  const result = await getDatabase(env)
    .prepare(
      `SELECT c.id, c.user_id, c.parent_id, c.content, c.created_at, u.nickname, u.email
       FROM comments c LEFT JOIN users u ON u.id = c.user_id
       WHERE c.target_type = ? AND c.target_id = ?
       ORDER BY c.created_at ASC LIMIT 500`
    )
    .bind(targetType, targetId)
    .all();
  return result.results || [];
}

function commentHtml(c, t, viewerId, depth) {
  const isOwner = Boolean(viewerId && c.user_id === viewerId);
  const name = c.nickname || t.userPrefix.replace('{n}', String(c.user_id || '').slice(0, 8));
  const date = new Date(c.created_at * 1000).toISOString().slice(0, 10);
  return `    <div class="c-item${depth ? ' c-reply-item' : ''}" data-id="${escapeHtml(c.id)}">
      <div class="c-head">
        <img class="g-avatar" src="/avatar/${encodeURIComponent(c.user_id)}.svg" alt="" width="20" height="20">
        <a class="c-author" href="/u/${encodeURIComponent(c.user_id)}">${escapeHtml(name)}</a>
        <span class="c-date">${date}</span>
        ${viewerId ? `<button type="button" class="c-reply" data-id="${escapeHtml(c.id)}" data-name="${escapeHtml(name)}">${escapeHtml(t.commentReply)}</button>` : ''}
        ${isOwner ? `<button type="button" class="c-del" data-id="${escapeHtml(c.id)}">${escapeHtml(t.commentDelete)}</button>` : ''}
      </div>
      <div class="c-body">${plainText(c.content)}</div>`;
}

export function renderCommentsSection(comments, t, opts) {
  const { viewerId, targetType, targetId } = opts;
  const parents = comments.filter((c) => !c.parent_id);
  const repliesOf = (id) => comments.filter((c) => c.parent_id === id);

  const listHtml = parents.length
    ? parents
        .map((c) => {
          const replies = repliesOf(c.id)
            .map((r) => `${commentHtml(r, t, viewerId, 1)}\n      </div>`)
            .join('\n');
          return `${commentHtml(c, t, viewerId, 0)}${
            replies ? `\n      <div class="c-replies">\n${replies}\n      </div>` : ''
          }\n    </div>`;
        })
        .join('\n')
    : `<p class="c-empty">${escapeHtml(t.commentEmpty)}</p>`;

  const formHtml = viewerId
    ? `<form class="c-form" id="commentForm" data-type="${escapeHtml(targetType)}" data-id="${escapeHtml(targetId)}">
      <textarea id="commentContent" maxlength="1000" placeholder="${escapeHtml(t.commentPh)}" required></textarea>
      <div class="c-form-row">
        <span class="c-reply-hint" id="replyHint" hidden></span>
        <button class="btn" type="submit">${escapeHtml(t.commentBtn)}</button>
      </div>
    </form>`
    : `<p class="c-login-cta">${escapeHtml(t.commentLogin)} <a href="/">${escapeHtml(t.postLoginBtn)}</a></p>`;

  return `<section class="c-section" id="comments">
  <h2>${escapeHtml(t.commentTitle)}${comments.length ? ` · ${comments.length}` : ''}</h2>
  ${formHtml}
  <div class="c-list">
${listHtml}
  </div>
</section>`;
}

export const COMMENT_CSS = `
.c-section { margin: 28px 0 40px; }
.c-section h2 { font-size: 18px; margin: 0 0 14px; }
.c-form { display: grid; gap: 8px; margin-bottom: 20px; }
.c-form textarea {
  font: inherit; min-height: 84px; padding: 10px 12px; resize: vertical;
  border: 1px solid var(--color-hairline-strong); border-radius: 10px;
  background: var(--color-surface, #fff); color: var(--color-text);
}
.c-form-row { display: flex; align-items: center; gap: 10px; }
.c-reply-hint { font-size: 13px; color: var(--color-text-secondary); }
.c-login-cta { font-size: 14px; color: var(--color-text-secondary); padding: 12px 0; }
.c-empty { font-size: 14px; color: var(--color-text-tertiary); }
.c-item {
  padding: 12px 0; border-top: 1px solid var(--color-hairline);
}
.c-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.c-head .g-avatar { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--color-hairline); background: #fff; }
.c-author { font-size: 13.5px; font-weight: 600; color: var(--color-text); text-decoration: none; }
.c-author:hover { text-decoration: underline; }
.c-date { font-size: 12px; color: var(--color-text-tertiary); }
.c-reply, .c-del, .c-reply-cancel {
  border: none; background: none; cursor: pointer; font-size: 12px; font-family: inherit;
  color: var(--color-text-tertiary); padding: 0;
}
.c-reply:hover, .c-reply-cancel:hover { color: var(--color-text); }
.c-del:hover { color: #c0392b; }
.c-body { font-size: 14px; line-height: 1.65; color: var(--color-text); word-break: break-word; }
.c-replies { margin-left: 28px; }
.c-reply-item { border-top: none; padding: 8px 0 0; }
`;

export const COMMUNITY_SCRIPT = `
(function () {
  function post(path, data) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
  document.addEventListener('click', async function (e) {
    var likeBtn = e.target.closest('.g-like');
    if (likeBtn) {
      e.preventDefault();
      try {
        var res = await post('/api/likes', { file_id: likeBtn.dataset.file });
        if (res.status === 401) { location.href = '/'; return; }
        if (!res.ok) return;
        var data = await res.json();
        likeBtn.classList.toggle('liked', !!data.liked);
        var count = likeBtn.querySelector('.g-like-count');
        if (count) count.textContent = String(data.count);
      } catch (err) {}
      return;
    }
    var delComment = e.target.closest('.c-del');
    if (delComment) {
      e.preventDefault();
      if (!confirm('Delete this comment?')) return;
      var r1 = await fetch('/api/comments/' + delComment.dataset.id, { method: 'DELETE' });
      if (r1.ok) location.reload();
      return;
    }
    var delPost = e.target.closest('.p-del-post');
    if (delPost) {
      e.preventDefault();
      if (!confirm('Delete this post?')) return;
      var r2 = await fetch('/api/posts/' + delPost.dataset.id, { method: 'DELETE' });
      if (r2.ok) location.href = '/gallery';
      return;
    }
    var reply = e.target.closest('.c-reply');
    if (reply) {
      e.preventDefault();
      var form = document.getElementById('commentForm');
      if (!form) { location.href = '/'; return; }
      form.dataset.parent = reply.dataset.id;
      var hint = document.getElementById('replyHint');
      if (hint) {
        hint.hidden = false;
        hint.textContent = '@' + reply.dataset.name + ' ';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'c-reply-cancel';
        cancel.textContent = '取消';
        cancel.onclick = function () {
          delete form.dataset.parent;
          hint.hidden = true;
          if (hint.contains(cancel)) hint.removeChild(cancel);
        };
        hint.appendChild(cancel);
      }
      var box = document.getElementById('commentContent');
      if (box) box.focus();
      return;
    }
  });

  var commentForm = document.getElementById('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var box = document.getElementById('commentContent');
      var content = (box.value || '').trim();
      if (!content) return;
      var res = await post('/api/comments', {
        target_type: commentForm.dataset.type,
        target_id: commentForm.dataset.id,
        parent_id: commentForm.dataset.parent || null,
        content: content
      });
      if (res.status === 401) { location.href = '/'; return; }
      if (!res.ok) {
        var msg = await res.json().catch(function () { return {}; });
        alert(msg.error || '发送失败，请稍后再试');
        return;
      }
      location.reload();
    });
  }

  var postForm = document.getElementById('postForm');
  if (postForm) {
    postForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var content = (document.getElementById('postContent').value || '').trim();
      var title = (document.getElementById('postTitle').value || '').trim();
      if (!content) return;
      var res = await post('/api/posts', { title: title, content: content });
      if (res.status === 401) { location.href = '/'; return; }
      if (!res.ok) {
        var msg = await res.json().catch(function () { return {}; });
        alert(msg.error || '发布失败');
        return;
      }
      var data = await res.json();
      location.href = '/post/' + data.id;
    });
  }
})();
`;

export function renderComposer(t, viewer) {
  if (!viewer) {
    return `<div class="d-cta">${escapeHtml(t.postLoginCta)} — <a href="/">${escapeHtml(t.postLoginBtn)}</a></div>`;
  }
  return `<form class="d-composer" id="postForm">
    <img class="g-avatar" src="/avatar/${encodeURIComponent(viewer.id)}.svg" alt="" width="40" height="40">
    <div class="d-composer-body">
      <input id="postTitle" maxlength="100" placeholder="${escapeHtml(t.postTitlePh)}">
      <textarea id="postContent" maxlength="4000" placeholder="${escapeHtml(t.postPh)}" required></textarea>
      <div class="d-composer-foot">
        <span class="d-composer-hint">${escapeHtml(t.postHint)}</span>
        <button class="btn" type="submit">${escapeHtml(t.postBtn)}</button>
      </div>
    </div>
  </form>`;
}

// ---------------------------------------------------------------------------
// Discussion page /community
// ---------------------------------------------------------------------------

export async function handleDiscussionPage(request, env) {
  const lang = resolveLang(request);
  const t = I18N[lang] || I18N.en;
  const url = new URL(request.url);
  const viewer = await getCurrentUser(request, env);

  const { items, total, page: safePage, pages: totalPages, q, sort } = await queryPosts(env, {
    q: url.searchParams.get('q'),
    sort: url.searchParams.get('sort'),
    page: url.searchParams.get('page'),
    perPage: 20,
  });

  let listHtml;
  if (items.length > 0) {
    listHtml = `<div class="d-list">\n${renderPostRows(items, t)}\n  </div>`;
  } else if (q) {
    listHtml = `<div class="d-empty"><p>${escapeHtml(t.galleryNoResults)}</p></div>`;
  } else {
    listHtml = `<div class="d-empty"><p>${escapeHtml(t.discEmpty)}</p></div>`;
  }

  const pager = [];
  const paramsFor = (nextPage) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    p.set('sort', sort);
    if (nextPage > 1) p.set('page', String(nextPage));
    return `/community?${p.toString()}`;
  };
  if (safePage > 1) {
    pager.push(`<a href="${paramsFor(safePage - 1)}">‹ ${escapeHtml(t.galleryPrev)}</a>`);
  }
  pager.push(
    `<span class="d-pageinfo">${escapeHtml(t.galleryPageInfo.replace('{n}', String(safePage)).replace('{m}', String(totalPages)))}</span>`
  );
  if (safePage < totalPages) {
    pager.push(`<a href="${paramsFor(safePage + 1)}">${escapeHtml(t.galleryNext)} ›</a>`);
  }
  const pagerHtml = totalPages > 1 ? `<nav class="d-pager">${pager.join('')}</nav>` : '';

  const tabHref = (targetSort) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    p.set('sort', targetSort);
    return `/community?${p.toString()}`;
  };

  const nav = renderNav(
    lang,
    '/community',
    `<a class="account-button" href="/">${escapeHtml(t.accountBtn)}</a>`
  );

  const html = `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${escapeHtml(t.discTitle)} | Oh My Share</title>
<meta name="description" content="${escapeHtml(t.discMetaDesc)}">
${q ? '<meta name="robots" content="noindex,follow">' : ''}
<link rel="canonical" href="${url.origin}/community">
${q ? '' : hreflangLinks(url.origin, '/community')}
${q ? '' : `<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CollectionPage","name":${JSON.stringify(t.discTitle)},"description":${JSON.stringify(t.discMetaDesc)},"url":"${url.origin}/community","isPartOf":{"@type":"WebSite","name":"Oh My Share","url":"${url.origin}"}}
</script>`}
<meta property="og:site_name" content="Oh My Share">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(t.discTitle)}">
<meta property="og:description" content="${escapeHtml(t.discMetaDesc)}">
<meta property="og:url" content="${url.origin}/community">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<style>${BASE_CSS}
${COMMENT_CSS}
${DISC_CSS}
</style>
</head>
<body>
${nav}
<main class="d-main">
  <header class="d-hero">
    <h1>${escapeHtml(t.discTitle)}</h1>
    <p>${escapeHtml(t.discSubtitle)}</p>
  </header>
  <div style="text-align:center">
    <nav class="seg-tabs">
      <a class="active" href="/community">${escapeHtml(t.tabDiscussions)}</a>
      <a href="/gallery">${escapeHtml(t.tabWorks)}</a>
    </nav>
  </div>
  <form class="d-search" action="/community" method="get">
    <input type="hidden" name="sort" value="${sort}">
    <input type="search" name="q" value="${escapeHtml(q)}" placeholder="${escapeHtml(t.discSearchPlaceholder)}" maxlength="40">
    <button type="submit">${escapeHtml(t.gallerySearchBtn)}</button>
  </form>
  ${renderComposer(t, viewer)}
  <div class="d-bar">
    <a class="g-tab${sort === 'new' ? ' active' : ''}" href="${tabHref('new')}">${escapeHtml(t.gallerySortNew)}</a>
    <a class="g-tab${sort === 'hot' ? ' active' : ''}" href="${tabHref('hot')}">${escapeHtml(t.gallerySortHot)}</a>
    <span class="d-count">${escapeHtml(t.discCount.replace('{n}', String(total)))}</span>
  </div>
  ${listHtml}
  ${pagerHtml}
</main>
${renderFooter(lang)}
<script>${COMMUNITY_SCRIPT}</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=15, stale-while-revalidate=60',
      Vary: 'Accept-Language, Cookie',
    },
  });
}

// ---------------------------------------------------------------------------
// Post detail page /post/:id
// ---------------------------------------------------------------------------

export async function handlePostPage(request, env, id) {
  const lang = resolveLang(request);
  const t = I18N[lang] || I18N.en;
  const url = new URL(request.url);
  const viewer = await getCurrentUser(request, env);
  const database = getDatabase(env);

  const post = await database
    .prepare(
      `SELECT p.id, p.user_id, p.title, p.content, p.work_id, p.created_at, u.nickname, u.email
       FROM posts p LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`
    )
    .bind(id)
    .first();

  if (!post) {
    const nav = renderNav(
      lang,
      '/gallery',
      `<a class="account-button" href="/">${escapeHtml(t.accountBtn)}</a>`
    );
    return new Response(
      `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${escapeHtml(t.post404)} | Oh My Share</title>
<meta name="robots" content="noindex">
<style>${BASE_CSS}</style>
</head>
<body>
${nav}
<main style="max-width:760px;margin:0 auto;padding:56px 20px;text-align:center">
<h1>${escapeHtml(t.post404)}</h1>
<p><a href="/gallery">${escapeHtml(t.profileBack)}</a></p>
</main>
${renderFooter(lang)}
</body>
</html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const isSelf = Boolean(viewer && viewer.id === post.user_id);
  const name = displayName(
    { id: post.user_id, nickname: post.nickname, email: post.email || '' },
    t,
    isSelf
  );
  const date = new Date(post.created_at * 1000).toISOString().slice(0, 10);

  let attachHtml = '';
  if (post.work_id) {
    const work = await database
      .prepare(
        `SELECT f.id, f.title, f.description, f.tags, f.filename, f.published_at, f.owner_id,
                u.nickname,
                (SELECT COUNT(*) FROM visits v WHERE v.file_id = f.id) AS views,
                (SELECT COUNT(*) FROM likes l WHERE l.file_id = f.id) AS likes
         FROM files f LEFT JOIN users u ON u.id = f.owner_id
         WHERE f.id = ? AND f.published_at > 0 AND f.reported_at IS NULL`
      )
      .bind(post.work_id)
      .first();
    if (work) {
      attachHtml = `<section class="p-attach"><h2>${escapeHtml(t.postAttach)}</h2><div class="g-grid">
${renderWorkCards([work], t)}
      </div></section>`;
    }
  }

  const comments = await fetchComments(env, 'post', post.id);
  const nav = renderNav(
    lang,
    '/gallery',
    `<a class="account-button" href="/">${escapeHtml(t.accountBtn)}</a>`
  );

  const html = `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${escapeHtml(post.title || excerpt(post.content, 40))} | Oh My Share</title>
<meta name="description" content="${escapeHtml(excerpt(post.content))}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url.origin}/post/${encodeURIComponent(post.id)}">
${hreflangLinks(url.origin, `/post/${post.id}`)}
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"DiscussionForumPosting","headline":${JSON.stringify(post.title || excerpt(post.content, 60))},"text":${JSON.stringify(post.content.slice(0, 500))},"url":"${url.origin}/post/${post.id}","author":{"@type":"Person","name":${JSON.stringify(name)},"url":"${url.origin}/u/${post.user_id}"},"datePublished":${JSON.stringify(new Date(post.created_at * 1000).toISOString())}}
</script>
<meta property="og:site_name" content="Oh My Share">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(post.title || excerpt(post.content, 40))}">
<meta property="og:url" content="${url.origin}/post/${encodeURIComponent(post.id)}">
<style>${BASE_CSS}
${GALLERY_CSS}
${COMMENT_CSS}
.p-post { max-width: 760px; margin: 0 auto; padding: 44px 20px 20px; }
.p-post-crumb { font-size: 13px; color: var(--color-text-tertiary); margin-bottom: 12px; }
.p-post-crumb a { color: inherit; }
.p-post h1 { font-size: clamp(22px, 4vw, 30px); margin: 0 0 14px; line-height: 1.3; word-break: break-word; }
.p-post-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--color-text-tertiary); margin-bottom: 20px; }
.p-post-meta .g-avatar { width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--color-hairline); background: #fff; }
.p-post-meta a { color: var(--color-text); font-weight: 600; text-decoration: none; }
.p-post-body { font-size: 15.5px; line-height: 1.75; word-break: break-word; margin-bottom: 10px; }
.p-attach h2 { font-size: 15px; margin: 0 0 10px; }
.p-post-wrap { max-width: 760px; margin: 0 auto; padding: 0 20px 40px; }
</style>
</head>
<body>
${nav}
<article class="p-post">
  <div class="p-post-crumb"><a href="/gallery">${escapeHtml(t.galleryH1)}</a> /</div>
  ${post.title ? `<h1>${escapeHtml(post.title)}</h1>` : ''}
  <div class="p-post-meta">
    <img class="g-avatar" src="/avatar/${encodeURIComponent(post.user_id)}.svg" alt="" width="24" height="24">
    <a href="/u/${encodeURIComponent(post.user_id)}">${escapeHtml(name)}</a>
    <span>${date}</span>
    ${isSelf ? `<button type="button" class="c-del p-del-post" data-id="${escapeHtml(post.id)}">${escapeHtml(t.postDelete)}</button>` : ''}
  </div>
  <div class="p-post-body">${plainText(post.content)}</div>
  ${attachHtml}
</article>
<div class="p-post-wrap">
${renderCommentsSection(comments, t, { viewerId: viewer ? viewer.id : null, targetType: 'post', targetId: post.id })}
</div>
${renderFooter(lang)}
<script>${COMMUNITY_SCRIPT}</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
