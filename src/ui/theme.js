import { I18N } from '../i18n.js';

// Owner contact address — shown in the footer, on /contact and in legal pages.
export const CONTACT_EMAIL = '1400875096@qq.com';

// Breadcrumb trail for BreadcrumbList JSON-LD. Home is always the first item so
// the structured data mirrors the visible nav hierarchy.
export function breadcrumbs(lang, items) {
  const t = I18N[lang] || I18N.en;
  const home = lang === 'zh' ? '首页' : 'Home';
  return [{ name: home, path: '/' }, ...items];
}

// hreflang alternates for a bilingual path: en = bare URL, zh = ?lang=zh,
// x-default = en. Add to <head> of every indexable marketing page.
export function hreflangLinks(origin, path) {
  const en = `${origin}${path}`;
  return `<link rel="alternate" hreflang="en" href="${en}">
<link rel="alternate" hreflang="zh" href="${origin}${path}?lang=zh">
<link rel="alternate" hreflang="x-default" href="${en}">`;
}

// FAQPage JSON-LD from a [[question, answer], …] list — matches the on-page
// <details> FAQ so search and answer engines see the same content.
export function faqJsonLd(faq) {
  const mainEntity = (faq || []).map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  }));
  if (!mainEntity.length) return null;
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity };
}

// Shared design system: tokens + common components used by all pages.
// Visual direction: warm paper + ink editorial UI — serif display type,
// generous whitespace, hairline rules, terracotta/ochre/sage accents.
export const BASE_CSS = `
/* ============================================ */
/* Design tokens                                */
/* ============================================ */
:root {
  --paper: #f4efe4;
  --paper-deep: #ece4d4;
  --card: #fbf7ee;
  --ink: #1c1a17;
  --ink-2: #45423a;
  --ink-3: #6a6357;

  --color-bg: var(--paper);
  --color-surface: var(--card);
  --color-surface-2: #f7f1e5;
  --color-input: #fffdf7;

  --color-text: var(--ink);
  --color-text-secondary: var(--ink-2);
  --color-text-tertiary: var(--ink-3);

  --color-hairline: rgba(28,26,23,0.14);
  --color-hairline-strong: rgba(28,26,23,0.26);
  --color-fill: rgba(28,26,23,0.06);
  --color-fill-hover: rgba(28,26,23,0.10);

  --color-accent: #4f6b52;
  --color-accent-strong: #3c5340;
  --color-link: #a34d2c;
  --color-terracotta: #a34d2c;
  --color-ochre: #a8792f;
  --color-sage: #4f6b52;

  /* legacy aliases referenced by client JS */
  --color-accent-pink: var(--color-accent);
  --color-accent-cyan: var(--color-ochre);
  --text-main: var(--color-text);
  --color-brand: var(--color-link);
  --color-danger: var(--error);

  --gradient-primary: var(--color-accent);

  --success: #4f6b52;
  --success-bg: rgba(79,107,82,0.10);
  --error: #93331c;
  --error-bg: rgba(147,51,28,0.08);

  --radius-card: 20px;
  --radius-md: 12px;
  --radius-sm: 9px;
  --radius-pill: 999px;

  --shadow-card: 0 1px 0 rgba(255,255,255,0.7) inset, 0 22px 44px -32px rgba(64,46,26,0.55);
  --shadow-card-hover: 0 1px 0 rgba(255,255,255,0.7) inset, 0 26px 54px -30px rgba(64,46,26,0.5);
  --shadow-btn: 0 1px 0 rgba(255,255,255,0.14) inset, 0 8px 20px -14px rgba(28,26,23,0.5);
  --shadow-glow: 0 0 0 3px rgba(79,107,82,0.18);
  --shadow-modal: 0 30px 90px rgba(28,26,23,0.30);

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

  --font-sans: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC',
    system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-display: 'Songti SC', 'STSong', 'Noto Serif SC', 'Source Han Serif SC',
    'SimSun', 'Times New Roman', serif;
  --font-mono: 'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace;

  --max-width: 1180px;
  --nav-height: 64px;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 160ms;
  --duration-base: 260ms;

  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #171410;
    --paper-deep: #1f1b15;
    --card: #221e17;
    --ink: #f3ecdf;
    --ink-2: #c9c0b0;
    --ink-3: #9a9080;

    --color-bg: var(--paper);
    --color-surface: var(--card);
    --color-surface-2: #28231b;
    --color-input: #2a241c;

    --color-text: var(--ink);
    --color-text-secondary: var(--ink-2);
    --color-text-tertiary: var(--ink-3);

    --color-hairline: rgba(243,236,223,0.14);
    --color-hairline-strong: rgba(243,236,223,0.24);
    --color-fill: rgba(243,236,223,0.08);
    --color-fill-hover: rgba(243,236,223,0.13);

    --color-accent: #4f6b52;
    --color-accent-strong: #8fae8b;
    --color-link: #dfa17e;
    --color-terracotta: #d18a64;
    --color-ochre: #cfaa6b;
    --color-sage: #8fae8b;

    --color-accent-pink: var(--color-accent);
    --color-accent-cyan: var(--color-ochre);
    --text-main: var(--color-text);
    --color-brand: var(--color-link);

    --gradient-primary: var(--color-accent);

    --success: #8fae8b;
    --success-bg: rgba(143,174,139,0.12);
    --error: #e08a7a;
    --error-bg: rgba(224,138,122,0.12);

    --shadow-card: 0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 50px -34px rgba(0,0,0,0.8);
    --shadow-card-hover: 0 1px 0 rgba(255,255,255,0.04) inset, 0 28px 58px -32px rgba(0,0,0,0.9);
    --shadow-btn: 0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 20px -14px rgba(0,0,0,0.8);
    --shadow-glow: 0 0 0 3px rgba(143,174,139,0.20);
    --shadow-modal: 0 30px 90px rgba(0,0,0,0.6);
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

[hidden] {
  display: none !important;
}

html {
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 16px;
  line-height: 1.65;
  letter-spacing: 0;
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

h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.3;
}

::selection {
  background: rgba(163,77,44,0.20);
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
  border-radius: 4px;
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
  background: color-mix(in srgb, var(--paper) 84%, transparent);
  -webkit-backdrop-filter: blur(14px) saturate(120%);
  backdrop-filter: blur(14px) saturate(120%);
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
  gap: 10px;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--color-text);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  min-height: 44px;
}

.nav-logo:hover {
  opacity: 0.78;
}

.nav-mark {
  width: 24px;
  height: 24px;
  color: var(--color-terracotta);
  flex: none;
}

.nav-mark svg {
  display: block;
  width: 100%;
  height: 100%;
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
  padding: 8px 2px;
  transition: color var(--duration-fast) ease;
  white-space: nowrap;
  position: relative;
}

.nav-links a::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  height: 1px;
  background: var(--color-terracotta);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--duration-base) var(--ease-out);
}

.nav-links a:hover,
.nav-links a.active {
  color: var(--color-text);
}

.nav-links a:hover::after,
.nav-links a.active::after {
  transform: scaleX(1);
}

.nav-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.lang-switch {
  background: transparent;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  padding: 7px 12px;
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--duration-fast) ease, color var(--duration-fast) ease;
}

.lang-switch:hover {
  background: var(--color-fill);
  color: var(--color-text);
}

.account-button {
  background: transparent;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  padding: 8px 16px;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 40px;
  transition: background var(--duration-fast) ease, border-color var(--duration-fast) ease,
    transform var(--duration-fast) ease;
}

.account-button:hover {
  background: var(--color-fill);
  border-color: var(--color-text-tertiary);
}

.account-button:active {
  transform: translateY(1px);
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
  .nav-inner {
    gap: 8px;
    padding: 0 14px;
  }
  .nav-logo {
    gap: 7px;
    font-size: 16px;
    min-width: 0;
  }
  .nav-word {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nav-actions {
    gap: 6px;
    min-width: 0;
    flex-shrink: 1;
  }
  .account-button {
    padding: 7px 10px;
    font-size: 12.5px;
    max-width: 126px;
    min-width: 0;
    flex-shrink: 1;
  }
  .lang-switch {
    padding: 6px 9px;
    flex: none;
  }
  .nav-menu {
    flex: none;
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
  padding: 0 20px;
  background: var(--color-accent);
  color: #fbf7ee;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background var(--duration-fast) ease, border-color var(--duration-fast) ease,
    transform var(--duration-fast) var(--ease-out), opacity var(--duration-fast) ease;
}

.btn:hover {
  background: var(--color-accent-strong);
  border-color: var(--color-accent-strong);
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn:disabled {
  background: #ddd5c5;
  border-color: #ddd5c5;
  color: #5e594f;
  cursor: not-allowed;
  transform: none;
}

@media (prefers-color-scheme: dark) {
  .btn:disabled {
    background: #3a342b;
    border-color: #3a342b;
    color: #9a9080;
  }
}

.btn-gradient {
  width: 100%;
}

.btn-outline {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  min-height: 40px;
  padding: 0 var(--space-5);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast) ease, border-color var(--duration-fast) ease;
}

.btn-outline:hover {
  background: var(--color-fill);
  border-color: var(--color-text-tertiary);
}

.action-btn {
  flex: 1;
  background: var(--color-fill);
  border: 1px solid transparent;
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
  background: var(--color-accent);
  color: #fbf7ee;
  border-color: var(--color-accent);
}

.action-btn.primary:hover {
  background: var(--color-accent-strong);
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
  font-size: 14.5px;
  letter-spacing: 0;
  padding: 11px 13px;
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
  font-size: 13.5px;
  font-weight: 500;
  margin-bottom: var(--space-2);
  color: var(--color-text-secondary);
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

.footer-note {
  max-width: 44em;
  margin-bottom: var(--space-10);
  font-family: var(--font-display);
  font-size: clamp(15px, 1.5vw, 17px);
  line-height: 1.9;
  color: var(--color-text-secondary);
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: var(--space-10);
  margin-bottom: var(--space-10);
}

.footer-col h4 {
  font-family: var(--font-display);
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: var(--space-4);
  color: var(--color-text);
}

.footer-col p {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.7;
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
  color: var(--color-link);
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

@media (max-width: 780px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8) var(--space-6);
  }
}

@media (max-width: 640px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }
}
`;

// Shared account-slot rendering so every page shows the same sign-in state:
// signed out -> "Sign in / Register" link home; signed in -> the account
// email (clicking goes home, where the account panel lives).
export function accountActionHtml(t, viewer) {
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  if (viewer) {
    const label = esc(viewer.email || viewer.id);
    return `<button class="account-button" id="accountBtn" title="${label}" onclick="location.href='/'">${label}</button>`;
  }
  return `<a class="account-button" href="/">${esc(t.accountBtn)}</a>`;
}

export function renderNav(lang, activePath, actionsHtml) {
  const t = I18N[lang] || I18N.en;
  // Slim nav: community + the two integration entry points. Everything else
  // lives in the footer and the home-page "More tools" section.
  const links = [
    { href: '/community', key: 'navGallery' },
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
      <span class="nav-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M7 6.5h12.5L25 12v13.5H7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M19.5 6.5V12H25" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M11 17.5h9.5M11 21h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </span><span class="nav-word">Oh My Share</span>
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
  <p class="footer-note" data-i18n="footerNote">${t.footerNote}</p>
  <div class="footer-grid">
    <div class="footer-col">
      <h4>Oh My Share</h4>
      <p data-i18n="footerDesc">${t.footerDesc}</p>
    </div>
    <div class="footer-col">
      <h4 data-i18n="footerTools">${t.footerTools}</h4>
      <a href="/community" data-i18n="navGallery">${t.navGallery}</a>
      <a href="/gallery" data-i18n="tabWorks">${t.tabWorks}</a>
      <a href="/html-viewer" data-i18n="navHtmlViewer">${t.navHtmlViewer}</a>
      <a href="/code-share" data-i18n="navCodeShare">${t.navCodeShare}</a>
      <a href="/codepen-alternative" data-i18n="navAlternative">${t.navAlternative}</a>
      <a href="/ai-html-publish" data-i18n="navAiPublish">${t.navAiPublish}</a>
      <a href="/mcp-guide" data-i18n="navMcp">${t.navMcp}</a>
      <a href="/guides" data-i18n="navGuides">${t.navGuides}</a>
      <a href="/corsproxy" data-i18n="navCors">${t.navCors}</a>
    </div>
<div class="footer-col">
      <h4 data-i18n="footerResources">${t.footerResources}</h4>
      <a href="/auth.md">API Docs</a>
      <a href="/demo" data-i18n="footerDemo">${t.footerDemo}</a>
      <a href="/extension.zip">Chrome Extension</a>
      <a href="https://github.com/shisongsong/oh-my-share" target="_blank" rel="noopener">GitHub</a>
      <a href="/abuse" data-i18n="footerAbuse">${t.footerAbuse}</a>
      <a href="/terms" data-i18n="footerTerms">${t.footerTerms}</a>
      <a href="/privacy" data-i18n="footerPrivacy">${t.footerPrivacy}</a>
      <a href="/feed.xml">RSS</a>
    </div>
    <div class="footer-col">
      <h4 data-i18n="footerContact">${t.footerContact}</h4>
      <a href="mailto:${CONTACT_EMAIL}" data-i18n="contactEmailLabel">${t.contactEmailLabel}: ${CONTACT_EMAIL}</a>
      <a href="/contact" data-i18n="contactWechatLabel">${t.contactWechatLabel}</a>
    </div>
  </div>
  </div>
  <div class="footer-bottom">
    <p>&copy; ${new Date().getFullYear()} Oh My Share. ${t.footerPowered}</p>
  </div>
</footer>`;
}
