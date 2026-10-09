import { BASE_CSS, renderNav, renderFooter } from '../ui/theme.js';
import { resolveLang, I18N } from '../i18n.js';
import {
  checkRateLimit,
  getClientIp,
  getDatabase,
  json,
} from '../security.js';
import { hashIp } from '../crypto.js';

function validId(id) {
  return Boolean(id) && /^[a-z0-9-]+$/i.test(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ABUSE_CSS = `
.abuse-main { max-width: 560px; margin: 0 auto; padding: 48px 20px 80px; }
.abuse-main h1 { font-size: clamp(24px, 4vw, 32px); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; }
.abuse-lead { color: var(--color-text-secondary); font-size: 14.5px; line-height: 1.6; margin-bottom: 28px; }
.abuse-field { margin-bottom: 18px; }
.abuse-field label { display: block; font-size: 13.5px; font-weight: 600; margin-bottom: 7px; color: var(--color-text); }
.abuse-field input[type="text"], .abuse-field textarea, .abuse-field select {
  width: 100%; padding: 11px 14px; font-size: 14.5px; font-family: var(--font-sans);
  border: 1px solid var(--color-hairline-strong); border-radius: var(--radius-md);
  background: var(--color-input); color: var(--color-text); outline: none; box-sizing: border-box;
}
.abuse-field input:focus, .abuse-field textarea:focus { border-color: var(--color-accent-pink); }
.abuse-field textarea { min-height: 96px; resize: vertical; }
.abuse-radio { display: flex; flex-direction: column; gap: 8px; }
.abuse-radio label { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 14px; margin: 0; cursor: pointer; }
.abuse-submit {
  width: 100%; min-height: 46px; border: none; border-radius: var(--radius-pill);
  background: var(--gradient-primary); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
}
.abuse-note { margin-top: 18px; font-size: 13px; color: var(--color-text-tertiary); line-height: 1.6; }
.abuse-ok {
  padding: 18px; border: 1px solid var(--color-hairline); border-radius: var(--radius-card);
  background: var(--color-surface); font-size: 14.5px; line-height: 1.6; color: var(--color-text);
}
`;

const MESSAGES = {
  zh: {
    title: '举报内容 - Oh My Share',
    h1: '举报内容',
    lead: '如果你在本站发现钓鱼、欺诈、违法或其他有害内容，请填写以下表单。我们承诺 24 小时内人工处理举报，钓鱼/欺诈类 4 小时内优先下架。',
    idLabel: '内容 ID（可选，来自链接 /view/ 或 /gallery/ 后的字符串）',
    idPlaceholder: '例如 a1b2c3d4e5',
    reasonLabel: '举报原因',
    reasonPhish: '钓鱼 / 仿冒登录页 / 诈骗',
    reasonIllegal: '违法有害内容',
    reasonIp: '侵犯知识产权',
    reasonOther: '其他',
    detailsLabel: '补充说明',
    detailsPlaceholder: '请描述问题，可粘贴相关链接',
    emailLabel: '联系邮箱（可选，用于回复处理结果）',
    submit: '提交举报',
    success: '举报已提交。我们会尽快人工审核；确认有害的内容将立即下架并通知搜索引擎移除。',
    backHome: '返回首页',
    appeal: '如果你是内容所有者且认为这是误判，请附上内容 ID 发邮件至 1400875096@qq.com 申诉，我们会在核实后恢复。',
  },
  en: {
    title: 'Report Content - Oh My Share',
    h1: 'Report Content',
    lead: 'If you find phishing, fraud, illegal, or otherwise harmful content on this site, fill in the form below. We manually review reports within 24 hours; phishing/fraud is taken down within 4 hours as priority.',
    idLabel: 'Content ID (optional — the string after /view/ or /gallery/ in the link)',
    idPlaceholder: 'e.g. a1b2c3d4e5',
    reasonLabel: 'Reason',
    reasonPhish: 'Phishing / fake login / scam',
    reasonIllegal: 'Illegal or harmful content',
    reasonIp: 'Intellectual property infringement',
    reasonOther: 'Other',
    detailsLabel: 'Details',
    detailsPlaceholder: 'Describe the issue, you can paste related links',
    emailLabel: 'Contact email (optional, for follow-up)',
    submit: 'Submit Report',
    success: 'Report submitted. We will review it manually soon; confirmed harmful content is taken down immediately and search engines are asked to remove it.',
    backHome: 'Back to Home',
    appeal: 'If you are the content owner and believe this is a mistake, email 1400875096@qq.com with the content ID and we will restore it after verification.',
  },
};

export async function handleAbusePage(request, env) {
  const lang = resolveLang(request);
  const t = MESSAGES[lang] || MESSAGES.en;
  const url = new URL(request.url);
  const prefillId = (url.searchParams.get('id') || '').trim().slice(0, 64);

  const nav = renderNav(
    lang,
    '',
    `<a class="lang-switch" href="/abuse?lang=${lang === 'zh' ? 'en' : 'zh'}${prefillId ? `&id=${encodeURIComponent(prefillId)}` : ''}">${lang === 'zh' ? 'EN' : '中'}</a>
      <a class="account-button" href="/">${escapeHtml(I18N[lang].accountBtn)}</a>`
  );

  const html = `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${escapeHtml(t.title)}</title>
<meta name="robots" content="noindex, nofollow">
<style>${BASE_CSS}
${ABUSE_CSS}</style>
</head>
<body>
${nav}
<main class="abuse-main">
  <h1>${escapeHtml(t.h1)}</h1>
  <p class="abuse-lead">${escapeHtml(t.lead)}</p>
  <form id="abuseForm">
    <div class="abuse-field">
      <label for="abuseId">${escapeHtml(t.idLabel)}</label>
      <input type="text" id="abuseId" name="id" value="${escapeHtml(prefillId)}" placeholder="${escapeHtml(t.idPlaceholder)}" maxlength="64">
    </div>
    <div class="abuse-field">
      <label>${escapeHtml(t.reasonLabel)}</label>
      <div class="abuse-radio">
        <label><input type="radio" name="reason" value="phishing" checked> ${escapeHtml(t.reasonPhish)}</label>
        <label><input type="radio" name="reason" value="illegal"> ${escapeHtml(t.reasonIllegal)}</label>
        <label><input type="radio" name="reason" value="ip"> ${escapeHtml(t.reasonIp)}</label>
        <label><input type="radio" name="reason" value="other"> ${escapeHtml(t.reasonOther)}</label>
      </div>
    </div>
    <div class="abuse-field">
      <label for="abuseDetails">${escapeHtml(t.detailsLabel)}</label>
      <textarea id="abuseDetails" name="details" placeholder="${escapeHtml(t.detailsPlaceholder)}" maxlength="2000"></textarea>
    </div>
    <div class="abuse-field">
      <label for="abuseEmail">${escapeHtml(t.emailLabel)}</label>
      <input type="text" id="abuseEmail" name="email" maxlength="200">
    </div>
    <button class="abuse-submit" type="submit">${escapeHtml(t.submit)}</button>
    <p id="abuseMsg" class="abuse-note" hidden></p>
  </form>
  <p class="abuse-note">${escapeHtml(t.appeal)}</p>
</main>
${renderFooter(lang)}
<script>
document.getElementById('abuseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('.abuse-submit');
  const msg = document.getElementById('abuseMsg');
  btn.disabled = true;
  try {
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: document.getElementById('abuseId').value.trim(),
        reason: (e.target.querySelector('input[name=reason]:checked') || {}).value || 'other',
        details: document.getElementById('abuseDetails').value,
        email: document.getElementById('abuseEmail').value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      msg.hidden = false;
      msg.textContent = ${JSON.stringify(t.success)};
      e.target.querySelector('.abuse-submit').style.display = 'none';
    } else {
      msg.hidden = false;
      msg.textContent = data.error || 'Error (' + res.status + ')';
      btn.disabled = false;
    }
  } catch (err) {
    msg.hidden = false;
    msg.textContent = String(err);
    btn.disabled = false;
  }
});
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

const REASONS = new Set(['phishing', 'illegal', 'ip', 'other']);

export async function handleReportSubmit(request, env) {
  const ip = getClientIp(request);
  const limit = await checkRateLimit(env, ip, 'report-h', 5, 3600);
  if (!limit.allowed) {
    return json({ error: 'Too many reports. Retry later.' }, 429, {
      'Retry-After': String(limit.retryAfter),
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const id = String(body.id || '').trim().slice(0, 64);
  if (!validId(id)) return json({ error: 'Invalid content ID' }, 400);

  const reason = REASONS.has(body.reason) ? body.reason : 'other';
  const details = String(body.details || '').slice(0, 2000);
  const email = String(body.email || '').slice(0, 200);

  const database = getDatabase(env);
  if (!database) return json({ error: 'Database unavailable' }, 503);

  const file = await database
    .prepare('SELECT id FROM files WHERE id = ?')
    .bind(id)
    .first();
  if (!file) return json({ error: 'Not found' }, 404);

  const now = Math.floor(Date.now() / 1000);
  const reporterHash = await hashIp(ip);

  await database
    .prepare(
      `INSERT INTO reports (file_id, reason, details, reporter_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, reason, email ? `${details}\n[contact: ${email}]` : details, reporterHash, now)
    .run();

  // Immediate action: unpublish from gallery + block public view pending review
  await database
    .prepare(
      `UPDATE files
       SET report_count = report_count + 1,
           reported_at = COALESCE(reported_at, ?),
           published_at = 0
       WHERE id = ?`
    )
    .bind(now, id)
    .run();

  return json({ ok: true });
}
