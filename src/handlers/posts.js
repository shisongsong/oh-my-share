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
// Mixed community feed (works + posts)
// ---------------------------------------------------------------------------

export async function queryCommunityFeed(env, opts = {}) {
  let q = (opts.q || '').trim().slice(0, 64);
  while (q.length > 0 && new TextEncoder().encode(`%${q}%`).length > 50) {
    q = q.slice(0, -1);
  }
  const sort = opts.sort === 'hot' ? 'hot' : 'new';
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const perPage = Math.min(50, Math.max(1, parseInt(opts.perPage, 10) || 24));
  const now = Math.floor(Date.now() / 1000);

  const escLike = (v) => v.replace(/[\\%_]/g, (m) => `\\${m}`);
  const pattern = q ? `%${escLike(q)}%` : null;

  const workConds = [
    'f.published_at > 0',
    'f.encrypted = 0',
    "(f.password_hash IS NULL OR f.password_hash = '')",
    '(f.expires_at IS NULL OR f.expires_at = 0 OR f.expires_at > ?)',
    'f.reported_at IS NULL',
  ];
  const workParams = [now];
  if (pattern) {
    workConds.push(
      `(f.title LIKE ? ESCAPE '\\' OR f.description LIKE ? ESCAPE '\\' OR f.tags LIKE ? ESCAPE '\\' OR f.id LIKE ? ESCAPE '\\')`
    );
    workParams.push(pattern, pattern, pattern, pattern);
  }

  const postConds = ['1 = 1'];
  const postParams = [];
  if (pattern) {
    postConds.push(`(p.title LIKE ? ESCAPE '\\' OR p.content LIKE ? ESCAPE '\\')`);
    postParams.push(pattern, pattern);
  }

  const workWhere = workConds.join(' AND ');
  const postWhere = postConds.join(' AND ');
  const totalRow = await getDatabase(env)
    .prepare(
      `SELECT COUNT(*) AS total FROM (
         SELECT f.id FROM files f WHERE ${workWhere}
         UNION ALL
         SELECT p.id FROM posts p WHERE ${postWhere}
       )`
    )
    .bind(...workParams, ...postParams)
    .first();
  const total = totalRow?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);

  const sql = `
    SELECT 'work' AS kind, f.id, f.title, COALESCE(f.description, '') AS body,
           f.filename, COALESCE(f.tags, '') AS tags, f.published_at AS at,
           f.owner_id, u.nickname,
           (SELECT COUNT(*) FROM visits v WHERE v.file_id = f.id) AS views,
           (SELECT COUNT(*) FROM likes l WHERE l.file_id = f.id) AS likes,
           (SELECT COUNT(*) FROM comments c WHERE c.target_type = 'work' AND c.target_id = f.id) AS comments
    FROM files f LEFT JOIN users u ON u.id = f.owner_id
    WHERE ${workConds.join(' AND ')}
    UNION ALL
    SELECT 'post' AS kind, p.id, p.title, p.content AS body,
           NULL AS filename, NULL AS tags, p.created_at AS at,
           p.user_id, u.nickname,
           0 AS views, 0 AS likes, p.comment_count AS comments
    FROM posts p LEFT JOIN users u ON u.id = p.user_id
    WHERE ${postConds.join(' AND ')}
    ORDER BY ${sort === 'hot' ? '(likes + comments) DESC, at DESC' : 'at DESC, title ASC'}
    LIMIT ? OFFSET ?`;

  const result = await getDatabase(env)
    .prepare(sql)
    .bind(...workParams, ...postParams, perPage, (safePage - 1) * perPage)
    .all();
  return { items: result.results || [], total, page: safePage, pages: totalPages, q, sort };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export function renderFeedCards(items, t) {
  const workCount = items.filter((i) => i.kind === 'work').length;
  const cards = items.map((item) => {
    const authorHtml = item.owner_id
      ? `<a class="g-card-author" href="/u/${encodeURIComponent(item.owner_id)}"><img class="g-avatar" src="/avatar/${encodeURIComponent(item.owner_id)}.svg" alt="" width="18" height="18"><span>${escapeHtml(item.nickname || t.userPrefix.replace('{n}', String(item.owner_id).slice(0, 8)))}</span></a>`
      : `<span class="g-card-author g-card-anon">${escapeHtml(t.galleryAuthor.replace('{n}', t.communityAnon))}</span>`;
    const date = item.at ? new Date(item.at * 1000).toISOString().slice(0, 10) : '';

    if (item.kind === 'post') {
      return `      <div class="g-card g-card-post">
        <div class="g-card-kind">${escapeHtml(t.feedPostBadge)}</div>
        <a class="g-card-title" href="/post/${encodeURIComponent(item.id)}">${escapeHtml(item.title || excerpt(item.body, 40))}</a>
        <p class="g-card-desc">${escapeHtml(excerpt(item.body))}</p>
        <div class="g-card-meta">
          ${authorHtml}
          <span>${escapeHtml(t.commentsLabel.replace('{n}', String(item.comments || 0)))}</span>
          <span>${date}</span>
        </div>
      </div>`;
    }

    const tags = (item.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((tag) => `<span class="g-card-tag">${escapeHtml(tag)}</span>`)
      .join('');
    const likes = item.likes || 0;
    return `      <div class="g-card">
        <a class="g-card-title" href="/gallery/${encodeURIComponent(item.id)}">${escapeHtml(item.title || item.filename || item.id)}</a>
        ${item.body ? `<p class="g-card-desc">${escapeHtml(item.body)}</p>` : ''}
        ${tags ? `<div class="g-card-tags">${tags}</div>` : ''}
        <div class="g-card-meta">
          ${authorHtml}
          <span>${escapeHtml(t.galleryViews.replace('{n}', String(item.views || 0)))}</span>
          ${item.comments ? `<span>${escapeHtml(t.commentsLabel.replace('{n}', String(item.comments)))}</span>` : ''}
          <button type="button" class="g-like" data-file="${escapeHtml(item.id)}" title="${escapeHtml(t.likesTitle)}" aria-label="${escapeHtml(t.likesTitle)}"><span class="g-like-heart">♥</span><span class="g-like-count">${likes}</span></button>
          <span>${date}</span>
        </div>
      </div>`;
  });
  return { html: cards.join('\n'), workCount };
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
.g-card-post .g-card-kind {
  display: inline-block; font-size: 11px; letter-spacing: 0.06em;
  color: var(--color-text-secondary); border: 1px solid var(--color-hairline-strong);
  border-radius: 999px; padding: 1px 8px; margin-bottom: 8px;
}
.g-composer {
  border: 1px solid var(--color-hairline); border-radius: 14px; background: var(--color-surface);
  padding: 14px 16px; margin: 0 0 22px; display: grid; gap: 8px;
}
.g-composer input, .g-composer textarea {
  font: inherit; padding: 9px 12px; border: 1px solid var(--color-hairline-strong);
  border-radius: 10px; background: var(--color-surface, #fff); color: var(--color-text);
}
.g-composer textarea { min-height: 70px; resize: vertical; }
.g-composer-row { display: flex; justify-content: flex-end; }
.g-composer-cta {
  border: 1px dashed var(--color-hairline-strong); border-radius: 14px;
  padding: 16px; text-align: center; margin-bottom: 22px;
  color: var(--color-text-secondary); font-size: 14px;
}
.g-composer-cta a { color: var(--color-text); font-weight: 600; }
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
    return `<div class="g-composer-cta">${escapeHtml(t.postLoginCta)} — <a href="/">${escapeHtml(t.postLoginBtn)}</a></div>`;
  }
  return `<form class="g-composer" id="postForm">
    <input id="postTitle" maxlength="100" placeholder="${escapeHtml(t.postTitlePh)}">
    <textarea id="postContent" maxlength="4000" placeholder="${escapeHtml(t.postPh)}" required></textarea>
    <div class="g-composer-row"><button class="btn" type="submit">${escapeHtml(t.postBtn)}</button></div>
  </form>`;
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
