import { I18N } from '../i18n.js';
import { CLIENT_SCRIPT } from './client-built.js';
import { STYLES } from './styles.js';

export function renderPage(lang) {
  const translations = I18N[lang] || I18N.en;
  const baseUrl = 'https://openanthropic.com';

  const seoMeta = lang === 'zh' ? `
<meta name="description" content="免费分享 HTML 文件和代码片段，端到端加密，无需注册。快速、安全的代码分享工具，由 Cloudflare 驱动。">
<meta name="keywords" content="代码分享, HTML分享, 在线粘贴, 代码片段, 加密分享, 安全分享, CodePen替代, Pastebin替代, JSFiddle替代, 在线代码编辑器, HTML预览, 代码沙盒, 匿名分享, 临时分享, 私密分享">
<meta property="og:title" content="Oh My Share - 免费安全的 HTML 和代码分享工具">
<meta property="og:description" content="免费分享 HTML 文件和代码片段，端到端加密，无需注册。快速、安全的代码分享工具。">
<meta name="twitter:title" content="Oh My Share - 免费安全的 HTML 和代码分享工具">
<meta name="twitter:description" content="免费分享 HTML 文件和代码片段，端到端加密，无需注册。快速、安全的代码分享工具。">
<meta name="google-site-verification" content="DBQv1hLP8zAfNxe33rUZVVM4ilMDoNrcpvwtJmoB03c">
` : `
<meta name="description" content="Share HTML files and code snippets instantly with end-to-end encryption. No registration required. Free, fast, and secure code sharing powered by Cloudflare.">
<meta name="keywords" content="code sharing, html sharing, paste bin, code snippet, encrypted sharing, secure sharing, codepen alternative, pastebin alternative, jsfiddle alternative, online code editor, html preview, code playground, anonymous sharing, temporary sharing, private sharing">
<meta property="og:title" content="Oh My Share - Free Secure HTML & Code Sharing Tool">
<meta property="og:description" content="Share HTML files and code snippets instantly with end-to-end encryption. No registration required.">
<meta name="twitter:title" content="Oh My Share - Free Secure HTML & Code Sharing Tool">
<meta name="twitter:description" content="Share HTML files and code snippets instantly with end-to-end encryption. No registration required.">
<meta name="google-site-verification" content="DBQv1hLP8zAfNxe33rUZVVM4ilMDoNrcpvwtJmoB03c">
`;

  return `<!DOCTYPE html>
<html lang="${translations.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Oh My Share - ${translations.subtitle}</title>
${seoMeta}
<meta name="robots" content="index, follow">
<meta name="author" content="Oh My Share">
<link rel="canonical" href="${baseUrl}/">
<meta property="og:type" content="website">
<meta property="og:url" content="${baseUrl}/">
<meta property="og:site_name" content="Oh My Share">
<meta property="og:image" content="${baseUrl}/og-image.png">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<meta property="og:locale:alternate" content="${lang === 'zh' ? 'en_US' : 'zh_CN'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${baseUrl}/og-image.png">
<link rel="alternate" hreflang="en" href="${baseUrl}/">
<link rel="alternate" hreflang="zh" href="${baseUrl}/?lang=zh">
<link rel="alternate" hreflang="x-default" href="${baseUrl}/">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Oh My Share",
  "url": "${baseUrl}",
  "description": "Free HTML and code sharing tool with end-to-end encryption",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "HTML file sharing",
    "Code snippet sharing",
    "End-to-end encryption",
    "No registration required",
    "Instant sharing"
  ]
}
</script>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
<style>${STYLES}</style>
</head>
<body>
<div class="container">
  <button class="lang-switch" id="langBtn" onclick="toggleLang()">
    <span id="langBtnText">${lang === 'zh' ? 'EN' : '中文'}</span>
  </button>
  <div class="header">
    <h1>Oh My Share</h1>
    <p data-i18n="subtitle"></p>
    <button class="account-button" id="accountBtn" data-i18n="accountBtn"></button>
  </div>
  <div class="tabs">
    <div class="tab active" data-target="panel-file" data-i18n="tabFile"></div>
    <div class="tab" data-target="panel-code" data-i18n="tabCode"></div>
  </div>
  <div class="form-content">
    <div class="upload-options">
      <label class="check-row">
        <input type="checkbox" id="encryptToggle" disabled>
        <span data-i18n="encryptLabel"></span>
      </label>
      <p class="option-hint" id="encryptStatus" data-i18n="encryptSignIn"></p>
      <div id="encryptDetails" hidden>
        <label class="select-label" for="keyMode" data-i18n="keyModeLabel"></label>
        <select id="keyMode">
          <option value="random" data-i18n="randomKey"></option>
          <option value="passphrase" data-i18n="passphraseKey"></option>
        </select>
        <input type="password" id="passphraseInput" data-i18n="passphrasePlaceholder" autocomplete="new-password" hidden>
      </div>
      <div id="upgradeSection" class="upgrade-section">
        <button class="upgrade-btn" id="upgradeBtn" data-i18n="upgradeBtn"></button>
      </div>
    </div>
    <div class="metadata-fields">
      <div class="input-group">
        <label data-i18n="titleLabel"></label>
        <input type="text" id="metaTitle" data-i18n="titlePlaceholder" maxlength="200">
      </div>
      <div class="input-group">
        <label data-i18n="descriptionLabel"></label>
        <textarea id="metaDescription" data-i18n="descriptionPlaceholder" rows="2" maxlength="1000"></textarea>
      </div>
      <div class="input-group">
        <label><span data-i18n="tagsLabel"></span><span class="optional" data-i18n="tagsOptional"></span></label>
        <input type="text" id="metaTags" data-i18n="tagsPlaceholder" maxlength="500">
      </div>
    </div>
    <div class="advanced-options">
      <div class="advanced-toggle" id="advancedToggle" onclick="toggleAdvanced()">
        <span data-i18n="advancedOptions"></span>
        <span class="advanced-arrow" id="advancedArrow">▸</span>
      </div>
      <div class="advanced-content" id="advancedContent" hidden>
        <div class="input-group">
          <label data-i18n="sharePasswordLabel"></label>
          <input type="password" id="sharePassword" data-i18n="sharePasswordPlaceholder" maxlength="128" autocomplete="new-password">
          <p class="option-hint" data-i18n="passwordHint"></p>
        </div>
        <div class="input-group">
          <label data-i18n="expiryLabel"></label>
          <select id="expirySelect">
            <option value="0" data-i18n="expiryPermanent"></option>
            <option value="3600" data-i18n="expiry1h"></option>
            <option value="86400" data-i18n="expiry1d"></option>
            <option value="604800" data-i18n="expiry7d"></option>
            <option value="2592000" data-i18n="expiry30d"></option>
          </select>
        </div>
      </div>
    </div>
    <div id="panel-file" class="panel active">
      <div class="drop-zone" id="dropZone">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
        <p><span data-i18n="dropText"></span><span class="link" data-i18n="dropLink"></span></p>
        <input type="file" id="fileInput" accept=".html,.htm">
      </div>
      <div class="input-group">
        <label><span data-i18n="slugLabel"></span><span class="optional" data-i18n="slugOptional"></span></label>
        <input type="text" id="slug-file" data-i18n="slugPlaceholderFile">
      </div>
      <button class="btn" id="btn-file" data-i18n="btnGenerate"></button>
    </div>
    <div id="panel-code" class="panel">
      <div class="input-group">
        <label data-i18n="codeLabel"></label>
        <textarea id="codeInput" data-i18n="codePlaceholder"></textarea>
      </div>
      <div class="input-group">
        <label><span data-i18n="slugLabel"></span><span class="optional" data-i18n="slugOptional"></span></label>
        <input type="text" id="slug-code" data-i18n="slugPlaceholderCode">
      </div>
      <button class="btn" id="btn-code" data-i18n="btnGenerate"></button>
    </div>
    <div class="result-box" id="resultBox">
      <h3 id="resultTitle"></h3>
      <p class="result-hint" id="resultHint"></p>
      <div class="result-url"><input type="text" id="resultUrl" readonly></div>
      <div class="result-actions">
        <button class="action-btn" id="copyBtn" data-i18n="copyBtn"></button>
        <button class="action-btn primary" id="imgBtn" data-i18n="btnImage"></button>
      </div>
    </div>
  </div>
</div>
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