import { I18N } from '../i18n.js';
import { CLIENT_SCRIPT } from './client-built.js';
import { STYLES } from './styles.js';
import { renderNav, renderFooter, CONTACT_EMAIL } from './theme.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


export function renderPage(lang, prefill = null) {
  const t = I18N[lang] || I18N.en;
  const baseUrl = 'https://openanthropic.com';
  const canonicalUrl = lang === 'zh' ? `${baseUrl}/?lang=zh` : `${baseUrl}/`;
  const remixId = prefill ? String(prefill.id || '') : '';
  const remixTitle = prefill ? String(prefill.title || '') : '';
  const remixCode = prefill ? String(prefill.code || '') : '';

  const seoMeta = lang === 'zh' ? `
<meta name="description" content="免费分享 HTML 文件和代码片段，可选端到端加密，无需注册。快速、安全的代码分享工具。">
<meta name="keywords" content="代码分享, HTML分享, 在线粘贴, 代码片段, 加密分享, CodePen替代, Pastebin替代">
<meta property="og:title" content="Oh My Share - 免费安全的 HTML 和代码分享工具">
<meta property="og:description" content="免费分享 HTML 文件和代码片段，可选端到端加密，无需注册。">
<meta name="twitter:title" content="Oh My Share - 免费安全的 HTML 和代码分享工具">
<meta name="twitter:description" content="免费分享 HTML 文件和代码片段，可选端到端加密，无需注册。">
` : `
<meta name="description" content="Share HTML files and code snippets instantly with optional end-to-end encryption. No registration required. Free, fast, and secure code sharing.">
<meta name="keywords" content="code sharing, html sharing, paste bin, code snippet, encrypted sharing, codepen alternative, pastebin alternative">
<meta property="og:title" content="Oh My Share - Free Secure HTML & Code Sharing Tool">
<meta property="og:description" content="Share HTML files and code snippets instantly with optional end-to-end encryption. No registration required.">
<meta name="twitter:title" content="Oh My Share - Free Secure HTML & Code Sharing Tool">
<meta name="twitter:description" content="Share HTML files and code snippets instantly with optional end-to-end encryption.">
`;
  const metaLocale = lang === 'zh' ? 'zh_CN' : 'en_US';
  const metaLocaleAlt = lang === 'zh' ? 'en_US' : 'zh_CN';

  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#f4efe4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#171410" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>Oh My Share - ${t.subtitle}</title>
${seoMeta}
<meta name="robots" content="${remixId ? 'noindex, nofollow' : 'index, follow'}">
<meta name="google-site-verification" content="DBQv1hLP8zAfNxe33rUZVVM4ilMDoNrcpvwtJmoB03c">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:site_name" content="Oh My Share">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:image" content="${baseUrl}/og-image.png">
<meta property="og:locale" content="${metaLocale}">
<meta property="og:locale:alternate" content="${metaLocaleAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${baseUrl}/og-image.png">
<link rel="alternate" hreflang="en" href="${baseUrl}/">
<link rel="alternate" hreflang="zh" href="${baseUrl}/?lang=zh">
<link rel="alternate" hreflang="x-default" href="${baseUrl}/">
<link rel="agent-card" href="${baseUrl}/.well-known/agent-card.json" type="application/json">
<link rel="mcp-server" href="${baseUrl}/.well-known/mcp/server-card.json" type="application/json">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "${baseUrl}/#organization",
      "name": "Oh My Share",
      "url": "${baseUrl}/",
      "logo": { "@type": "ImageObject", "url": "${baseUrl}/icon.svg" },
      "sameAs": ["https://github.com/shisongsong/oh-my-share"],
      "contactPoint": [{
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "${CONTACT_EMAIL}",
        "availableLanguage": ["zh-CN", "en"]
      }]
    },
    {
      "@type": "WebSite",
      "@id": "${baseUrl}/#website",
      "url": "${baseUrl}/",
      "name": "Oh My Share",
      "description": "Free HTML and code sharing tool with optional end-to-end encryption",
      "inLanguage": ["en", "zh-CN"],
      "publisher": { "@id": "${baseUrl}/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "${baseUrl}/gallery?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "WebApplication",
      "@id": "${baseUrl}/#app",
      "name": "Oh My Share",
      "url": "${baseUrl}/",
      "description": "Free HTML and code sharing tool with optional end-to-end encryption",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Any",
      "browserRequirements": "Requires JavaScript",
      "publisher": { "@id": "${baseUrl}/#organization" },
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    }
  ]
}
</script>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
<style>${STYLES}</style>
</head>
<body>
<a class="skip-link" href="#main" data-i18n="skipToContent">跳到主要内容</a>
<div class="grain" aria-hidden="true"></div>

<!-- Navigation -->
${renderNav(
  lang,
  '/',
  `<button class="lang-switch" id="langBtn" onclick="toggleLang()">
        <span id="langBtnText">${lang === 'zh' ? 'EN' : '中'}</span>
      </button>
      <button class="account-button" id="accountBtn" data-i18n="accountBtn">${t.accountBtn}</button>`
)}

<main class="home" id="main">
<section class="hero">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="specks" id="specks" aria-hidden="true"></div>
  <div class="hero-inner">
    <div class="hero-copy">
      <div class="greet-row">
        <p class="greet">
          <span class="greet-hello" id="greetHello"></span><span class="greet-line" id="greetLine">${t.greetingInitial}</span>
        </p>
        <button class="greeting-shuffle" id="greetingShuffle" type="button" data-i18n="greetingShuffle">${t.greetingShuffle}</button>
      </div>
      <p class="visually-hidden" id="greetLive" aria-live="polite"></p>

      <h1 class="hero-title"><span data-i18n="heroTitleLead">${t.heroTitleLead}</span><span class="hero-title-accent" data-i18n="heroTitleAccent">${t.heroTitleAccent}</span></h1>
      <p class="hero-subtitle" data-i18n="heroSubtitle">${t.heroSubtitle}</p>
    </div>

    <div class="hero-form">
      <div class="upload-card">
        ${remixId ? `<div class="remix-banner">
          <span>${esc(t.remixBanner)} <a href="/gallery/${esc(remixId)}">${esc(remixTitle || remixId)}</a></span>
          <a href="/">${esc(t.remixCancel)}</a>
        </div>
        <input type="hidden" id="remixedFrom" value="${esc(remixId)}">` : ''}

        <div class="card-head">
          <h2 class="card-title" data-i18n="uploadTitle">${t.uploadTitle}</h2>
          <p class="card-sub" data-i18n="uploadSub">${t.uploadSub}</p>
        </div>

        <div class="upload-tabs" role="tablist" aria-label="${esc(t.uploadTitle)}">
          <button class="upload-tab${remixId ? '' : ' active'}" data-target="panel-file" type="button" role="tab" aria-selected="${remixId ? 'false' : 'true'}" data-i18n="tabFile">${t.tabFile}</button>
          <button class="upload-tab${remixId ? ' active' : ''}" data-target="panel-code" type="button" role="tab" aria-selected="${remixId ? 'true' : 'false'}" data-i18n="tabCode">${t.tabCode}</button>
          ${remixId ? '' : `<button class="upload-tab" data-target="panel-folder" type="button" role="tab" aria-selected="false" data-i18n="tabFolder">${t.tabFolder}</button>`}
        </div>

        <div class="upload-body">
          <div id="panel-file" class="upload-panel${remixId ? '' : ' active'}" role="tabpanel">
            <div class="drop-zone" id="dropZone" role="button" tabindex="0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <p class="drop-title"><span data-i18n="dropText">${t.dropText}</span><span class="link" data-i18n="dropLink">${t.dropLink}</span></p>
              <p class="drop-sub" data-i18n="dropSub">${t.dropSub}</p>
              <input type="file" id="fileInput" accept=".html,.htm,text/html">
            </div>
          </div>

          <div id="panel-code" class="upload-panel${remixId ? ' active' : ''}" role="tabpanel">
            <label class="visually-hidden" for="codeInput" data-i18n="tabCode">${t.tabCode}</label>
            <textarea id="codeInput" class="code-textarea" data-i18n="codePlaceholder" rows="6">${esc(remixCode)}</textarea>
            <p class="option-hint" data-i18n="codeHint">${t.codeHint || ''}</p>
          </div>

          <div id="panel-folder" class="upload-panel" role="tabpanel">
            <div class="folder-gate" id="folderGate">
              <svg class="folder-gate-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 10.5V8a3.5 3.5 0 1 1 7 0v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <h3 data-i18n="folderGateTitle">${t.folderGateTitle}</h3>
              <p data-i18n="folderGateDesc">${t.folderGateDesc}</p>
              <button type="button" class="btn btn-outline" id="folderSignin" data-i18n="folderSignin">${t.folderSignin}</button>
            </div>

            <div class="folder-signed" id="folderSigned" hidden>
              <div class="drop-zone" id="folderDropZone" role="button" tabindex="0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <p class="drop-title"><span data-i18n="folderDropText">${t.folderDropText}</span><span class="link" data-i18n="folderDropLink">${t.folderDropLink}</span></p>
                <p class="drop-sub" data-i18n="folderDropSub">${t.folderDropSub}</p>
                <input type="file" id="folderInput" webkitdirectory multiple>
              </div>
              <p class="option-hint" data-i18n="folderHint">${t.folderHint}</p>
              <p class="option-hint" id="folderInfo" hidden></p>
              <p class="folder-note" data-i18n="folderSignedNote">${t.folderSignedNote}</p>
            </div>
          </div>
        </div>

        <details class="upload-options">
          <summary data-i18n="optionsToggle">${t.optionsToggle}</summary>
          <div class="options-grid">
            <div class="input-group">
              <label><span data-i18n="titleLabel">${t.titleLabel}</span><span class="optional" data-i18n="optional">${t.optional}</span></label>
              <input type="text" id="metaTitle" maxlength="200" data-i18n="titlePlaceholder" value="${remixId ? esc(remixTitle) : ''}">
            </div>
            <div class="input-group">
              <label><span data-i18n="descriptionLabel">${t.descriptionLabel}</span><span class="optional" data-i18n="optional">${t.optional}</span></label>
              <input type="text" id="metaDescription" maxlength="1000" data-i18n="descriptionPlaceholder">
            </div>
            <div class="input-group">
              <label><span data-i18n="tagsLabel">${t.tagsLabel}</span><span class="optional" data-i18n="optional">${t.optional}</span></label>
              <input type="text" id="metaTags" maxlength="500" data-i18n="tagsPlaceholder">
            </div>
            <div class="input-group folder-hide">
              <label class="check-row">
                <input type="checkbox" id="publishToGallery">
                <span data-i18n="publishGalleryLabel">${t.publishGalleryLabel}</span>
              </label>
              <p class="option-hint" data-i18n="publishGalleryHint">${t.publishGalleryHint}</p>
            </div>
            <div class="input-group folder-hide">
              <label><span data-i18n="slugLabel">${t.slugLabel}</span><span class="optional" data-i18n="optional">${t.optional}</span></label>
              <input type="text" id="slug-file" data-i18n="slugPlaceholderFile" placeholder="${t.slugPlaceholderFile}">
            </div>
            <div class="input-group">
              <label data-i18n="expiryLabel">${t.expiryLabel}</label>
              <select id="expirySelect">
                <option value="0" data-i18n="expiryPermanent">${t.expiryPermanent}</option>
                <option value="3600" data-i18n="expiry1h">${t.expiry1h}</option>
                <option value="86400" data-i18n="expiry1d">${t.expiry1d}</option>
                <option value="604800" data-i18n="expiry7d">${t.expiry7d}</option>
                <option value="2592000" data-i18n="expiry30d">${t.expiry30d}</option>
              </select>
            </div>
            <div class="input-group folder-hide">
              <label><span data-i18n="sharePasswordLabel">${t.sharePasswordLabel}</span><span class="optional" data-i18n="optional">${t.optional}</span></label>
              <input type="password" id="sharePassword" maxlength="128" autocomplete="new-password">
            </div>
          </div>
          <p class="option-hint folder-hide" data-i18n="passwordHint">${t.passwordHint}</p>
          <label class="check-row folder-hide">
            <input type="checkbox" id="encryptToggle" disabled>
            <span data-i18n="encryptLabel">${t.encryptLabel}</span>
          </label>
          <p class="option-hint folder-hide" id="encryptStatus" data-i18n="encryptSignIn">${t.encryptSignIn}</p>
          <p class="option-hint folder-hide" data-i18n="trialHint">${t.trialHint}</p>
          <div id="encryptDetails" class="folder-hide" hidden>
            <label class="select-label" for="keyMode" data-i18n="keyModeLabel">${t.keyModeLabel}</label>
            <select id="keyMode">
              <option value="random" data-i18n="randomKey">${t.randomKey}</option>
              <option value="passphrase" data-i18n="passphraseKey">${t.passphraseKey}</option>
            </select>
            <input type="password" id="passphraseInput" data-i18n="passphrasePlaceholder" autocomplete="new-password" hidden>
          </div>
          <div id="upgradeSection" class="upgrade-section folder-hide">
            <button type="button" class="upgrade-btn" id="upgradeBtn" data-i18n="upgradeBtn">${t.upgradeBtn}</button>
          </div>
        </details>

        <button class="btn btn-primary btn-upload" id="btn-file" type="button" disabled data-i18n="btnGenerate">${t.btnGenerate}</button>

        <div class="result-box" id="resultBox" hidden>
          <div class="result-url">
            <input type="text" id="resultUrl" readonly>
            <button class="action-btn" id="copyBtn" data-i18n="copyBtn">${t.copyBtn}</button>
          </div>
          <div class="result-actions">
            <button class="action-btn primary" id="imgBtn" data-i18n="btnImage">${t.btnImage}</button>
            <button class="action-btn" onclick="location.reload()" data-i18n="newShare">${t.newShare}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="trust" aria-label="${esc(t.trust1Title)}">
  <div class="trust-inner">
    <div class="trust-item">
      <h3 data-i18n="trust1Title">${t.trust1Title}</h3>
      <p data-i18n="trust1Desc">${t.trust1Desc}</p>
    </div>
    <div class="trust-item">
      <h3 data-i18n="trust2Title">${t.trust2Title}</h3>
      <p data-i18n="trust2Desc">${t.trust2Desc}</p>
    </div>
    <div class="trust-item">
      <h3 data-i18n="trust3Title">${t.trust3Title}</h3>
      <p data-i18n="trust3Desc">${t.trust3Desc}</p>
    </div>
  </div>
</section>

<section class="badge-showcase" aria-labelledby="badgeShowcaseTitle">
  <div class="badge-inner">
    <div class="badge-copy">
      <h2 id="badgeShowcaseTitle" data-i18n="badgeTitle">${t.badgeTitle}</h2>
      <p data-i18n="badgeDesc">${t.badgeDesc}</p>
    </div>
    <div class="badge-swatches">
      <figure class="badge-swatch badge-swatch-light">
        <figcaption data-i18n="badgeLight">${t.badgeLight}</figcaption>
        <div class="badge-stage">
          <div class="demo-badge" role="group" aria-label="Oh My Share badge">
            <a class="demo-badge-brand" href="/">
              <span class="demo-badge-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 4.5h9L19 9v10.5H5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span>
              <span class="demo-badge-text">Made with <b>Oh My Share</b></span>
            </a>
            <span class="demo-badge-div" aria-hidden="true"></span>
            <a class="demo-badge-link" href="/?auth=register&amp;utm_source=badge" data-i18n="badgeCta">${t.badgeCta}</a>
          </div>
        </div>
      </figure>
      <figure class="badge-swatch badge-swatch-ink">
        <figcaption data-i18n="badgeDark">${t.badgeDark}</figcaption>
        <div class="badge-stage">
          <div class="demo-badge demo-badge-dark" role="group" aria-label="Oh My Share badge">
            <a class="demo-badge-brand" href="/">
              <span class="demo-badge-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 4.5h9L19 9v10.5H5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span>
              <span class="demo-badge-text">Made with <b>Oh My Share</b></span>
            </a>
            <span class="demo-badge-div" aria-hidden="true"></span>
            <a class="demo-badge-link" href="/?auth=register&amp;utm_source=badge" data-i18n="badgeCta">${t.badgeCta}</a>
          </div>
        </div>
      </figure>
    </div>
    <p class="badge-status" data-i18n="badgeStatus">${t.badgeStatus}</p>
  </div>
</section>
</main>

<section class="more-tools" id="tools">
  <div class="more-tools-inner">
    <div class="more-tools-head">
      <h2 data-i18n="toolsTitle">${t.toolsTitle}</h2>
      <p data-i18n="toolsDesc">${t.toolsDesc}</p>
    </div>
    <div class="more-tools-grid">
      <a class="tool-link" href="/html-viewer"><span class="tool-num">01</span><span class="tool-body"><strong data-i18n="navHtmlViewer">${t.navHtmlViewer}</strong><span data-i18n="toolViewerDesc">${t.toolViewerDesc}</span></span><span class="tool-arrow" aria-hidden="true">↗</span></a>
      <a class="tool-link" href="/code-share"><span class="tool-num">02</span><span class="tool-body"><strong data-i18n="navCodeShare">${t.navCodeShare}</strong><span data-i18n="toolShareDesc">${t.toolShareDesc}</span></span><span class="tool-arrow" aria-hidden="true">↗</span></a>
      <a class="tool-link" href="/codepen-alternative"><span class="tool-num">03</span><span class="tool-body"><strong data-i18n="navAlternative">${t.navAlternative}</strong><span data-i18n="toolPenDesc">${t.toolPenDesc}</span></span><span class="tool-arrow" aria-hidden="true">↗</span></a>
      <a class="tool-link" href="/ai-html-publish"><span class="tool-num">04</span><span class="tool-body"><strong data-i18n="navAiPublish">${t.navAiPublish}</strong><span data-i18n="toolAiDesc">${t.toolAiDesc}</span></span><span class="tool-arrow" aria-hidden="true">↗</span></a>
      <a class="tool-link" href="/mcp-guide"><span class="tool-num">05</span><span class="tool-body"><strong data-i18n="navMcp">${t.navMcp}</strong><span data-i18n="toolMcpDesc">${t.toolMcpDesc}</span></span><span class="tool-arrow" aria-hidden="true">↗</span></a>
      <a class="tool-link" href="/corsproxy"><span class="tool-num">06</span><span class="tool-body"><strong data-i18n="navCors">${t.navCors}</strong><span data-i18n="toolCorsDesc">${t.toolCorsDesc}</span></span><span class="tool-arrow" aria-hidden="true">↗</span></a>
    </div>
  </div>
</section>

<!-- Footer -->
${renderFooter(lang)}

<!-- Account Modal -->
<div class="modal" id="accountModal">
  <div class="modal-content account-modal">
    <div class="modal-header">
      <div class="modal-title" data-i18n="accountTitle"></div>
      <button class="modal-close" id="accountClose" type="button">&times;</button>
    </div>
    <div id="authView">
      <h3 class="account-heading" id="authModeTitle" data-i18n="loginTitle"></h3>
      <form id="authForm">
        <div class="input-group">
          <label for="authEmail" data-i18n="emailLabel"></label>
          <input class="account-input" id="authEmail" type="email" data-i18n="emailPlaceholder" autocomplete="email" required>
        </div>
        <div class="input-group">
          <label for="authPassword" data-i18n="passwordLabel"></label>
          <input class="account-input" id="authPassword" type="password" data-i18n="passwordPlaceholder" autocomplete="current-password" required>
        </div>
        <button class="btn" id="authSubmit" type="submit" data-i18n="loginSubmit"></button>
      </form>
      <div class="oauth-divider"><span data-i18n="orContinueWith"></span></div>
      <a href="/oauth/google" style="text-decoration:none">
        <button class="btn oauth-btn" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google
        </button>
      </a>
      <a href="/oauth/github" style="text-decoration:none">
        <button class="btn oauth-btn" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          GitHub
        </button>
      </a>
      <p class="modal-message" id="authMessage"></p>
      <button class="text-button" id="authModeSwitch" type="button" data-i18n="switchToRegister"></button>
    </div>
    <div id="accountView" hidden>
      <p class="account-email" id="accountEmail"></p>
      <button class="action-btn" id="logoutBtn" type="button" data-i18n="logoutBtn"></button>
      <div class="asset-section">
        <h3 class="account-heading" data-i18n="assetsTitle"></h3>
        <div id="assetList" class="asset-list"></div>
      </div>
    </div>
  </div>
</div>

<!-- Image Modal -->
<div class="modal" id="imageModal">
  <div class="modal-content">
    <div class="modal-header">
      <div class="modal-title" data-i18n="imageTitle"></div>
      <button class="modal-close" onclick="closeImageModal()">&times;</button>
    </div>
    <canvas id="shareCanvas"></canvas>
    <div class="modal-footer">
      <button class="btn" id="downloadBtn" data-i18n="downloadBtn"></button>
    </div>
  </div>
</div>

<!-- Upgrade Modal -->
<div class="modal" id="upgradeModal">
  <div class="modal-content upgrade-modal">
    <div class="modal-header">
      <div class="modal-title" data-i18n="upgradeTitle"></div>
      <button class="modal-close" onclick="closeUpgradeModal()">&times;</button>
    </div>
    <div class="upgrade-content">
      <p class="upgrade-desc" data-i18n="upgradeDesc"></p>
      <div class="pricing-card">
        <div class="pricing-price">
          <span class="pricing-main" id="pricingMain"></span>
          <span class="pricing-alt" id="pricingAlt"></span>
        </div>
        <p class="pricing-features" data-i18n="pricingFeatures"></p>
      </div>
      <div class="payment-methods">
        <div class="payment-method">
          <h4 data-i18n="paymentPaypal"></h4>
          <p data-i18n="paymentAccount"></p>
        </div>
        <div class="payment-method">
          <h4 data-i18n="paymentAlipay"></h4>
          <p data-i18n="paymentAccount"></p>
        </div>
      </div>
      <p class="payment-note" data-i18n="paymentNote"></p>
      <button class="btn upgrade-send-btn" id="upgradeSendBtn" data-i18n="upgradeSendEmail"></button>
    </div>
  </div>
</div>

<script id="i18n-data" type="application/json">${JSON.stringify(I18N)}</script>
<script>var CURRENT_LANG = '${lang}';</script>
<script>${CLIENT_SCRIPT}</script>
</body>
</html>`;
}
