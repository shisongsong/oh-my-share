import { I18N, resolveLang } from '../i18n.js';
import { renderNav, renderFooter, accountActionHtml, hreflangLinks, CONTACT_EMAIL } from '../ui/theme.js';
import { renderDocument } from '../ui/render-document.js';
import { getCurrentUser } from '../auth.js';

const BASE_URL = 'https://openanthropic.com';
// Served from R2 (see the /wechat-qrcode.jpg route in src/index.js).
// Bump the version when the image is replaced so caches pick it up.
const WECHAT_QR_PATH = '/wechat-qrcode.jpg?v=1';

const CONTACT_CSS = `
.contact-main {
  max-width: 620px;
  margin: 0 auto;
  padding: clamp(36px, 6vw, 64px) var(--space-5) var(--space-10);
}
.contact-main h1 {
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-3);
}
.contact-lead {
  color: var(--color-text-secondary);
  font-size: 15px;
  line-height: 1.7;
  margin-bottom: var(--space-8);
}
.contact-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}
.contact-card {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 22px;
  text-align: center;
}
.contact-card h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.contact-email {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-accent-strong);
  text-decoration: none;
  word-break: break-all;
}
.contact-email:hover { text-decoration: underline; }
.contact-copy {
  margin-top: 14px;
  width: 100%;
  min-height: 38px;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.contact-copy:hover { border-color: var(--color-accent-pink); color: var(--color-accent-pink); }
.contact-qr {
  width: 100%;
  max-width: 240px;
  height: auto;
  display: block;
  margin: 0 auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-hairline);
  background: #fff;
}
.contact-hint {
  margin-top: 14px;
  font-size: 13px;
  color: var(--color-text-tertiary);
  line-height: 1.6;
}
`;

export async function handleContactPage(request, env) {
  const lang = resolveLang(request);
  const t = I18N[lang] || I18N.en;
  const altLang = lang === 'zh' ? 'en' : 'zh';
  const viewer = await getCurrentUser(request, env);

  const copyLabel = t.contactCopy;
  const copiedLabel = t.contactCopied;

  const html = renderDocument({
    lang,
    title: `${t.contactTitle} - Oh My Share`,
    description: `${t.contactLead} ${t.contactEmailLabel}: ${CONTACT_EMAIL}`,
    robots: 'index, follow',
    canonical: `${BASE_URL}/contact`,
    hreflangPath: '/contact',
    og: true,
    twitter: true,
    styles: [CONTACT_CSS],
    nav: renderNav(
      lang,
      '',
      `<a class="lang-switch" href="/contact?lang=${altLang}">${altLang === 'zh' ? '中文' : 'EN'}</a>
      ${accountActionHtml(t, viewer)}`
    ),
    body: `<main class="contact-main">
  <h1>${t.contactTitle}</h1>
  <p class="contact-lead">${t.contactLead}</p>
  <div class="contact-cards">
    <section class="contact-card">
      <h2>${t.contactEmailLabel}</h2>
      <a class="contact-email" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
      <button class="contact-copy" id="contactCopy" type="button" data-label="${copyLabel}" data-done="${copiedLabel}">${copyLabel}</button>
    </section>
    <section class="contact-card">
      <h2>${t.contactWechatLabel}</h2>
      <img class="contact-qr" src="${WECHAT_QR_PATH}" alt="${t.contactWechatAlt}" width="240" height="240" loading="lazy" decoding="async">
      <p class="contact-hint">${t.contactWechatHint}</p>
    </section>
  </div>
</main>`,
    scripts: [
      `(function () {
  var btn = document.getElementById('contactCopy');
  if (!btn) return;
  btn.addEventListener('click', async function () {
    var email = ${JSON.stringify(CONTACT_EMAIL)};
    try {
      await navigator.clipboard.writeText(email);
      btn.textContent = btn.getAttribute('data-done') || email;
    } catch (err) {
      btn.textContent = email;
    }
  });
})();`,
    ],
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
      Vary: 'Accept-Language, Cookie',
    },
  });
}

// Serves the owner WeChat QR image out of R2.
export async function handleWechatQr(request, env) {
  const object = await env.MY_BUCKET.get('wechat-qrcode.jpg');
  if (!object) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Length': String(object.size || 0),
      'X-Content-Type-Options': 'nosniff',
    },
  });
}