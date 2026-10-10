import { I18N } from '../i18n.js';

// Shared design system: tokens + common components used by all pages.
// Visual direction: refined, Apple-inspired product UI — system typography,
// generous whitespace, frosted sticky nav, soft layered shadows, hairline
// borders, pill CTAs — while keeping the brand pink→cyan gradient as accent.
export const BASE_CSS = `
/* ============================================ */
/* Design tokens                                */
/* ============================================ */
:root {
  --color-bg: #f5f5f7;
  --color-surface: #ffffff;
  --color-surface-2: #ffffff;
  --color-input: #ffffff;

  --color-text: #1d1d1f;
  --color-text-secondary: #6e6e73;
  --color-text-tertiary: #86868b;

  --color-hairline: rgba(0,0,0,0.08);
  --color-hairline-strong: rgba(0,0,0,0.14);
  --color-fill: rgba(120,120,128,0.12);
  --color-fill-hover: rgba(120,120,128,0.18);

  --color-accent-pink: #ff5c7c;
  --color-accent-cyan: #5ce1d4;
  --color-accent-strong: #d6325c;
  --color-link: #d6325c;

  /* legacy aliases referenced by client JS */
  --text-main: var(--color-text);
  --color-brand: var(--color-accent-strong);
  --color-danger: var(--error);

  --gradient-primary: linear-gradient(135deg, #ff5c7c 0%, #ff92a8 34%, #8fe6da 66%, #5ce1d4 100%);

  --success: #34c759;
  --success-bg: rgba(52,199,89,0.12);
  --error: #ff3b30;
  --error-bg: rgba(255,59,48,0.10);

  --radius-card: 20px;
  --radius-md: 12px;
  --radius-sm: 9px;
  --radius-pill: 980px;

  --shadow-card: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 2px 6px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.10);
  --shadow-btn: 0 1px 2px rgba(0,0,0,0.10), 0 6px 16px rgba(0,0,0,0.08);
  --shadow-glow: 0 0 0 4px rgba(255,92,124,0.18);
  --shadow-modal: 0 24px 80px rgba(0,0,0,0.28);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Inter,
    'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas,
    'Liberation Mono', monospace;

  --max-width: 1000px;
  --nav-height: 52px;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;

  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #000000;
    --color-surface: #141416;
    --color-surface-2: #1c1c1e;
    --color-input: #1c1c1e;

    --color-text: #f5f5f7;
    --color-text-secondary: #98989d;
    --color-text-tertiary: #6e6e73;

    --color-hairline: rgba(255,255,255,0.13);
    --color-hairline-strong: rgba(255,255,255,0.22);
    --color-fill: rgba(120,120,128,0.24);
    --color-fill-hover: rgba(120,120,128,0.34);

    --color-accent-strong: #ff7d96;
    --color-link: #ff7d96;

    --success: #30d158;
    --success-bg: rgba(48,209,88,0.16);
    --error: #ff453a;
    --error-bg: rgba(255,69,58,0.14);

    --shadow-card: 0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.45);
    --shadow-card-hover: 0 2px 6px rgba(0,0,0,0.55), 0 16px 40px rgba(0,0,0,0.55);
    --shadow-btn: 0 1px 2px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.4);
    --shadow-glow: 0 0 0 4px rgba(255,92,124,0.26);
    --shadow-modal: 0 24px 80px rgba(0,0,0,0.7);
  }
}

/* ============================================ */
/* Reset                                        */
/* ============================================ */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

html {
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 15px;
  line-height: 1.5;
  letter-spacing: -0.01em;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color var(--duration-base) ease, color var(--duration-base) ease;
}

a {
  color: var(--color-link);
  text-decoration: none;
  transition: color var(--duration-fast) ease, opacity var(--duration-fast) ease;
}

::selection {
  background: rgba(255,92,124,0.25);
}

/* ============================================ */
/* Layout helpers                               */
/* ============================================ */
.container {
  background: var(--color-surface);
  width: 100%;
  max-width: var(--max-width);
  margin: var(--space-8) auto;
  padding: var(--space-8) var(--space-6);
  position: relative;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

@media (min-width: 768px) {
  .container {
    padding: var(--space-10) var(--space-10);
  }
}

.header {
  text-align: center;
  padding: var(--space-2) 0 var(--space-6);
  border-bottom: 1px solid var(--color-hairline);
  margin-bottom: var(--space-6);
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-2);
}

.header p {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* ============================================ */
/* Navigation                                   */
/* ============================================ */
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--color-surface) 72%, transparent);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--color-hairline);
}

.nav-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  height: var(--nav-height);
  padding: 0 var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-5);
  position: relative;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--color-text);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.nav-logo:hover {
  opacity: 0.82;
}

.nav-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--gradient-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.35), 0 2px 6px rgba(255,92,124,0.30);
}

.nav-links {
  display: flex;
  gap: var(--space-6);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.nav-links a {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: 6px 2px;
  transition: color var(--duration-fast) ease;
  white-space: nowrap;
}

.nav-links a:hover,
.nav-links a.active {
  color: var(--color-text);
}

.nav-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.lang-switch {
  background: var(--color-fill);
  border: none;
  border-radius: var(--radius-pill);
  padding: 6px 12px;
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  transition: background var(--duration-fast) ease;
}

.lang-switch:hover {
  background: var(--color-fill-hover);
}

.account-button {
  background: var(--color-fill);
  border: none;
  border-radius: var(--radius-pill);
  padding: 7px 15px;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--duration-fast) ease, transform var(--duration-fast) ease;
}

.account-button:hover {
  background: var(--color-fill-hover);
}

.account-button:active {
  transform: scale(0.97);
}

.nav-menu {
  display: none;
  margin-left: auto;
}

.nav-menu > summary {
  list-style: none;
  cursor: pointer;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4.5px;
  background: var(--color-fill);
}

.nav-menu > summary::-webkit-details-marker {
  display: none;
}

.nav-menu > summary span {
  display: block;
  width: 15px;
  height: 1.6px;
  background: var(--color-text);
  border-radius: 2px;
  transition: transform var(--duration-base) var(--ease-out), opacity var(--duration-fast);
}

.nav-menu[open] > summary span:nth-child(1) {
  transform: translateY(6.1px) rotate(45deg);
}

.nav-menu[open] > summary span:nth-child(2) {
  opacity: 0;
}

.nav-menu[open] > summary span:nth-child(3) {
  transform: translateY(-6.1px) rotate(-45deg);
}

.nav-menu-panel {
  position: absolute;
  top: calc(var(--nav-height) - 6px);
  right: var(--space-4);
  left: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card-hover);
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  animation: menu-in 0.18s var(--ease-out);
}

.nav-menu-panel a {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--color-text);
  padding: 11px 12px;
  border-radius: var(--radius-sm);
  text-decoration: none;
}

.nav-menu-panel a:hover,
.nav-menu-panel a.active {
  background: var(--color-fill);
}

@keyframes menu-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 760px) {
  .nav-links {
    display: none;
  }
  .nav-menu {
    display: block;
    order: 3;
  }
  .nav-actions {
    margin-left: auto;
  }
}

@media (max-width: 420px) {
  .nav-logo .nav-word {
    display: none;
  }
}

/* ============================================ */
/* Buttons                                      */
/* ============================================ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 var(--space-6);
  background: var(--gradient-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: var(--shadow-btn);
  transition: transform var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) ease, box-shadow var(--duration-base) ease;
}

.btn:hover {
  filter: brightness(1.05) saturate(1.05);
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0) scale(0.985);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  filter: none;
}

.btn-gradient {
  width: 100%;
}

.btn-outline {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  min-height: 40px;
  padding: 0 var(--space-5);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast) ease;
}

.btn-outline:hover {
  background: var(--color-fill);
}

.action-btn {
  flex: 1;
  background: var(--color-fill);
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px var(--space-3);
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text);
  text-align: center;
  transition: background var(--duration-fast) ease, transform var(--duration-fast) ease;
}

.action-btn:hover {
  background: var(--color-fill-hover);
}

.action-btn:active {
  transform: scale(0.97);
}

.action-btn.copied {
  background: var(--success);
  color: #ffffff;
}

.action-btn.primary {
  background: var(--gradient-primary);
  color: #ffffff;
  box-shadow: var(--shadow-btn);
}

.action-btn.primary:hover {
  filter: brightness(1.05);
  background: var(--gradient-primary);
}

.text-button {
  border: 0;
  background: transparent;
  color: var(--color-link);
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  padding: var(--space-2) 0;
}

.text-button:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ============================================ */
/* Forms                                        */
/* ============================================ */
.input, select, textarea, .account-input,
.input-group input[type=text], .input-group input[type=password],
.input-group input[type=email] {
  font-family: var(--font-sans);
  font-size: 15px;
  letter-spacing: -0.01em;
  padding: 11px 14px;
  background: var(--color-input);
  color: var(--color-text);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  width: 100%;
  transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
}

.input:focus, select:focus, textarea:focus, .account-input:focus,
.input-group input:focus {
  outline: none;
  border-color: var(--color-accent-pink);
  box-shadow: var(--shadow-glow);
}

.input::placeholder, textarea::placeholder,
.input-group input::placeholder, .account-input::placeholder {
  color: var(--color-text-tertiary);
}

.input-group {
  margin-bottom: var(--space-4);
}

.input-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: var(--space-2);
  color: var(--color-text);
}

.input-group .optional {
  color: var(--color-text-tertiary);
  font-weight: 400;
}

.check-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
}

.check-row input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent-pink);
  cursor: pointer;
}

.check-row input:disabled {
  cursor: not-allowed;
}

.option-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: var(--space-2);
}

.select-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}

/* ============================================ */
/* Footer                                       */
/* ============================================ */
.footer {
  border-top: 1px solid var(--color-hairline);
  margin-top: var(--space-16);
  padding: var(--space-12) var(--space-5) var(--space-8);
  max-width: var(--max-width);
  margin-left: auto;
  margin-right: auto;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-10);
  margin-bottom: var(--space-10);
}

.footer-col h4 {
  font-size: 12.5px;
  font-weight: 600;
  margin-bottom: var(--space-4);
  color: var(--color-text);
}

.footer-col p {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.65;
  max-width: 340px;
}

.footer-col a {
  display: block;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 13px;
  padding: 5px 0;
  transition: color var(--duration-fast) ease;
}

.footer-col a:hover {
  color: var(--color-text);
}

.footer-bottom {
  border-top: 1px solid var(--color-hairline);
  padding-top: var(--space-6);
  text-align: center;
}

.footer-bottom p {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

@media (max-width: 640px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }
}
`;

export function renderNav(lang, activePath, actionsHtml) {
  const t = I18N[lang] || I18N.en;
  const links = [
    { href: '/gallery', key: 'navGallery' },
    { href: '/html-viewer', key: 'navHtmlViewer' },
    { href: '/code-share', key: 'navCodeShare' },
    { href: '/codepen-alternative', key: 'navAlternative' },
    { href: '/mcp-guide', key: 'navMcp' },
    { href: '/corsproxy', key: 'navCors' },
  ];

  const linkHtml = links
    .map(
      (l) =>
        `<a href="${l.href}" class="${activePath === l.href ? 'active' : ''}" data-i18n="${l.key}">${t[l.key]}</a>`
    )
    .join('\n      ');

  return `<header class="nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo" aria-label="Oh My Share">
      <span class="nav-mark">O</span><span class="nav-word">Oh My Share</span>
    </a>
    <nav class="nav-links">
      ${linkHtml}
    </nav>
    <div class="nav-actions">${actionsHtml}</div>
    <details class="nav-menu">
      <summary aria-label="Menu"><span></span><span></span><span></span></summary>
      <div class="nav-menu-panel">
        ${linkHtml}
      </div>
    </details>
  </div>
</header>`;
}

export function renderFooter(lang) {
  const t = I18N[lang] || I18N.en;
  return `<footer class="footer">
  <div class="footer-grid">
    <div class="footer-col">
      <h4>Oh My Share</h4>
      <p>${t.footerDesc}</p>
    </div>
    <div class="footer-col">
      <h4 data-i18n="footerTools">${t.footerTools}</h4>
      <a href="/gallery" data-i18n="navGallery">${t.navGallery}</a>
      <a href="/html-viewer" data-i18n="navHtmlViewer">${t.navHtmlViewer}</a>
      <a href="/code-share" data-i18n="navCodeShare">${t.navCodeShare}</a>
      <a href="/codepen-alternative" data-i18n="navAlternative">${t.navAlternative}</a>
      <a href="/ai-html-publish" data-i18n="navAiPublish">${t.navAiPublish}</a>
      <a href="/mcp-guide" data-i18n="navMcp">${t.navMcp}</a>
      <a href="/corsproxy" data-i18n="navCors">${t.navCors}</a>
    </div>
    <div class="footer-col">
      <h4 data-i18n="footerResources">${t.footerResources}</h4>
      <a href="/auth.md">API Docs</a>
      <a href="/demo">${lang === 'zh' ? '产品演示' : 'Product Demo'}</a>
      <a href="/extension.zip">Chrome Extension</a>
      <a href="https://github.com/shisongsong/oh-my-share" target="_blank" rel="noopener">GitHub</a>
      <a href="/abuse" data-i18n="footerAbuse">${t.footerAbuse}</a>
      <a href="/terms" data-i18n="footerTerms">Terms</a>
      <a href="/privacy" data-i18n="footerPrivacy">Privacy</a>
      <a href="/feed.xml">RSS</a>
    </div>
  </div>
  <div class="footer-bottom">
    <p>&copy; ${new Date().getFullYear()} Oh My Share. ${t.footerPowered}</p>
  </div>
</footer>`;
}
