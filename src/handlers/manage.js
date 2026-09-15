import { I18N } from '../i18n.js';
import { CLIENT_SCRIPT } from '../ui/client-built.js';
import { STYLES } from '../ui/styles.js';
import { getDatabase, json } from '../security.js';
import { hashPassword, hashIp } from '../crypto.js';

function validId(id) {
  return Boolean(id) && /^[a-z0-9-]+$/i.test(id);
}

export async function handleEditPage(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.slice('/edit/'.length);
  if (!validId(id)) return new Response('Invalid ID', { status: 400 });

  const editToken = url.searchParams.get('token');
  if (!editToken) return new Response('Missing edit token', { status: 400 });

  const database = getDatabase(env);
  if (!database) return new Response('Database not available', { status: 500 });

  const file = await database
    .prepare('SELECT id, title, description, tags, edit_token FROM files WHERE id = ?')
    .bind(id)
    .first();

  if (!file) return new Response('Not Found', { status: 404 });
  if (file.edit_token !== editToken) return new Response('Invalid token', { status: 403 });

  const lang = url.searchParams.get('lang') === 'zh' ? 'zh' : 'en';
  const t = I18N[lang] || I18N.en;

  return new Response(renderEditPage(id, editToken, file, lang, t), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function handleEditSave(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.slice('/api/edit/'.length);
  if (!validId(id)) return json({ error: 'Invalid ID' }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { editToken, title, description, tags } = body;
  if (!editToken) return json({ error: 'Missing edit token' }, 400);

  const database = getDatabase(env);
  if (!database) return json({ error: 'Database not available' }, 500);

  const file = await database
    .prepare('SELECT id, edit_token FROM files WHERE id = ?')
    .bind(id)
    .first();

  if (!file) return json({ error: 'Not found' }, 404);
  if (file.edit_token !== editToken) return json({ error: 'Invalid token' }, 403);

  const now = Math.floor(Date.now() / 1000);
  await database
    .prepare(
      `UPDATE files SET title = ?, description = ?, tags = ?, updated_at = ? WHERE id = ?`
    )
    .bind(
      (title || '').toString().slice(0, 200),
      (description || '').toString().slice(0, 1000),
      (tags || '').toString().slice(0, 500),
      now,
      id
    )
    .run();

  return json({ success: true });
}

export async function handleManagePage(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.slice('/manage/'.length);
  if (!validId(id)) return new Response('Invalid ID', { status: 400 });

  const editToken = url.searchParams.get('token');
  if (!editToken) return new Response('Missing edit token', { status: 400 });

  const database = getDatabase(env);
  if (!database) return new Response('Database not available', { status: 500 });

  const file = await database
    .prepare('SELECT id, title, edit_token, created_at, expires_at, password_hash FROM files WHERE id = ?')
    .bind(id)
    .first();

  if (!file) return new Response('Not Found', { status: 404 });
  if (file.edit_token !== editToken) return new Response('Invalid token', { status: 403 });

  const lang = url.searchParams.get('lang') === 'zh' ? 'zh' : 'en';
  const t = I18N[lang] || I18N.en;

  // 获取统计数据
  const totalVisits = await database
    .prepare('SELECT COUNT(*) as count FROM visits WHERE file_id = ?')
    .bind(id)
    .first();

  const uniqueVisitors = await database
    .prepare('SELECT COUNT(DISTINCT ip_hash) as count FROM visits WHERE file_id = ?')
    .bind(id)
    .first();

  return new Response(renderManagePage(id, editToken, file, {
    totalVisits: totalVisits?.count || 0,
    uniqueVisitors: uniqueVisitors?.count || 0,
  }, lang, t), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderEditPage(id, editToken, file, lang, t) {
  const translations = {
    zh: {
      title: '编辑分享 - Oh My Share',
      editTitle: '编辑内容信息',
      titleLabel: '标题',
      descriptionLabel: '描述',
      tagsLabel: '标签',
      saveBtn: '保存修改',
      successMsg: '保存成功！',
      errorMsg: '保存失败，请重试。',
    },
    en: {
      title: 'Edit Share - Oh My Share',
      editTitle: 'Edit Content Info',
      titleLabel: 'Title',
      descriptionLabel: 'Description',
      tagsLabel: 'Tags',
      saveBtn: 'Save Changes',
      successMsg: 'Saved successfully!',
      errorMsg: 'Save failed, please try again.',
    },
  };
  const msg = translations[lang] || translations.en;

  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${msg.title}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Oh My Share</h1>
    <p>${msg.editTitle}</p>
  </div>
  <form id="editForm" class="form-content">
    <div class="metadata-fields">
      <div class="input-group">
        <label>${msg.titleLabel}</label>
        <input type="text" id="editTitle" value="${file.title || ''}" maxlength="200">
      </div>
      <div class="input-group">
        <label>${msg.descriptionLabel}</label>
        <textarea id="editDescription" rows="3" maxlength="1000">${file.description || ''}</textarea>
      </div>
      <div class="input-group">
        <label>${msg.tagsLabel}</label>
        <input type="text" id="editTags" value="${file.tags || ''}" maxlength="500">
      </div>
    </div>
    <button class="btn" type="submit">${msg.saveBtn}</button>
    <p id="editMessage" class="modal-message"></p>
  </form>
</div>
<script>
document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('editMessage');
  try {
    const resp = await fetch('/api/edit/${id}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        editToken: '${editToken}',
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDescription').value,
        tags: document.getElementById('editTags').value,
      }),
    });
    const data = await resp.json();
    if (resp.ok) {
      msg.textContent = '${msg.successMsg}';
      msg.style.color = 'var(--color-brand)';
    } else {
      msg.textContent = data.error || '${msg.errorMsg}';
      msg.style.color = 'var(--color-danger)';
    }
  } catch {
    msg.textContent = '${msg.errorMsg}';
    msg.style.color = 'var(--color-danger)';
  }
});
</script>
</body>
</html>`;
}

function renderManagePage(id, editToken, file, stats, lang, t) {
  const translations = {
    zh: {
      title: '管理分享 - Oh My Share',
      manageTitle: '管理分享内容',
      infoTitle: '基本信息',
      titleLabel: '标题',
      createdLabel: '创建时间',
      expiresLabel: '过期时间',
      passwordLabel: '密码保护',
      statsTitle: '访问统计',
      totalVisits: '总访问量',
      uniqueVisitors: '独立访客',
      editBtn: '编辑信息',
      deleteBtn: '删除内容',
      copyLinkBtn: '复制链接',
      permanent: '永久',
      expired: '已过期',
      hasPassword: '已设置',
      noPassword: '未设置',
    },
    en: {
      title: 'Manage Share - Oh My Share',
      manageTitle: 'Manage Shared Content',
      infoTitle: 'Basic Info',
      titleLabel: 'Title',
      createdLabel: 'Created',
      expiresLabel: 'Expires',
      passwordLabel: 'Password Protected',
      statsTitle: 'Visit Statistics',
      totalVisits: 'Total Visits',
      uniqueVisitors: 'Unique Visitors',
      editBtn: 'Edit Info',
      deleteBtn: 'Delete Content',
      copyLinkBtn: 'Copy Link',
      permanent: 'Permanent',
      expired: 'Expired',
      hasPassword: 'Set',
      noPassword: 'Not set',
    },
  };
  const msg = translations[lang] || translations.en;

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts * 1000).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
  };

  const expiresText = file.expires_at ? formatDate(file.expires_at) : msg.permanent;
  const passwordText = file.password_hash ? msg.hasPassword : msg.noPassword;

  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${msg.title}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Oh My Share</h1>
    <p>${msg.manageTitle}</p>
  </div>
  <div class="form-content">
    <div class="metadata-fields">
      <h3>${msg.infoTitle}</h3>
      <div class="input-group">
        <label>${msg.titleLabel}</label>
        <p>${file.title || '-'}</p>
      </div>
      <div class="input-group">
        <label>${msg.createdLabel}</label>
        <p>${formatDate(file.created_at)}</p>
      </div>
      <div class="input-group">
        <label>${msg.expiresLabel}</label>
        <p>${expiresText}</p>
      </div>
      <div class="input-group">
        <label>${msg.passwordLabel}</label>
        <p>${passwordText}</p>
      </div>
    </div>
    <div class="metadata-fields">
      <h3>${msg.statsTitle}</h3>
      <div class="input-group">
        <label>${msg.totalVisits}</label>
        <p>${stats.totalVisits}</p>
      </div>
      <div class="input-group">
        <label>${msg.uniqueVisitors}</label>
        <p>${stats.uniqueVisitors}</p>
      </div>
    </div>
    <div class="result-actions">
      <button class="action-btn" onclick="window.location.href='/edit/${id}?token=${editToken}&lang=${lang}'">${msg.editBtn}</button>
      <button class="action-btn" onclick="navigator.clipboard.writeText(window.location.origin + '/view/${id}')">${msg.copyLinkBtn}</button>
    </div>
  </div>
</div>
</body>
</html>`;
}
