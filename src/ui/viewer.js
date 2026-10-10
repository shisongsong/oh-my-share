import { safeViewerMetadata } from '../encryption.js';
import { BASE_CSS, renderNav, renderFooter } from './theme.js';

function viewerScript(id, nonce, metadata) {
  const endpoint = `/api/content/${encodeURIComponent(id)}`;
  return `
// nonce: ${nonce}
const metadata = ${safeViewerMetadata(metadata)};
const endpoint = ${JSON.stringify(endpoint)};

// Force reload: redirect with random param if missing
if (!location.search.includes('v=')) {
  location.replace(location.pathname + '?v=' + Math.random().toString(36).slice(2) + location.hash);
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch (error) {
    return null;
  }
}

async function getDecryptionKey() {
  const encodedKey = new URLSearchParams(location.hash.slice(1)).get('key');
  const keyBytes = decodeBase64Url(encodedKey);
  if (!keyBytes) throw new Error('A valid decryption key is required.');

  if (metadata.keyMode === 'random') {
    if (keyBytes.length !== 32) throw new Error('The decryption key is invalid.');
    return crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    );
  }

  const passphrase = new TextDecoder().decode(keyBytes);
  if (!passphrase) throw new Error('The passphrase is empty.');
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: decodeBase64Url(metadata.salt),
      iterations: metadata.iterations,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function renderDecryptedDocument() {
  const status = document.getElementById('status');
  try {
    const key = await getDecryptionKey();
    const response = await fetch(endpoint, { credentials: 'omit' });
    if (!response.ok) throw new Error('The encrypted content is unavailable.');
    const ciphertext = await response.arrayBuffer();
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decodeBase64Url(metadata.iv) },
      key,
      ciphertext
    );
    const frame = document.getElementById('content');
    frame.srcdoc = new TextDecoder().decode(plaintext);
    frame.hidden = false;
    status.hidden = true;
  } catch (error) {
    const frame = document.getElementById('content');
    frame.hidden = true;
    frame.srcdoc = '';
    status.textContent = error.message || 'Unable to decrypt this content.';
    status.className = 'error';
  }
}

renderDecryptedDocument();`;
}

export function renderEncryptedViewer(id, metadata, social = {}, lang = 'en') {
  const nonce = Math.random().toString(36).slice(2);
  const socialTitle = String(social.title || '').trim() || 'Encrypted page on Oh My Share';
  const socialDesc = String(social.description || '').trim();
  const origin = String(social.origin || 'https://openanthropic.com');
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const other = lang === 'zh' ? 'en' : 'zh';
  const nav = renderNav(
    lang,
    '',
    `<a class="lang-switch" href="?lang=${other}">${other === 'zh' ? '中文' : 'EN'}</a>
     <a class="account-button" href="/">${lang === 'zh' ? '回到应用' : 'Back to app'}</a>`
  );
  const footer = renderFooter(lang);
  const socialMeta = [
    `<meta property="og:site_name" content="Oh My Share">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${esc(`${origin}/view/${id}`)}">`,
    `<meta property="og:title" content="${esc(socialTitle)}">`,
    socialDesc ? `<meta property="og:description" content="${esc(socialDesc)}">` : '',
    `<meta property="og:image" content="${esc(`${origin}/og-image.png`)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(socialTitle)}">`,
    `<meta name="twitter:image" content="${esc(`${origin}/og-image.png`)}">`,
  ].filter(Boolean).join('\n');
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Oh My Share</title>
${socialMeta}
<style>${BASE_CSS}
  body { margin: 0; min-height: 100vh; background: #f4f6f8; color: #24313d; display: block; }
  .viewer-shell { padding: 16px; }
  #status { padding: 1.5rem; text-align: center; }
  #status.error { color: #a32626; }
  iframe {
    width: 100%;
    min-height: calc(100vh - var(--nav-height, 64px) - 240px);
    border: 0;
    background: white;
    display: block;
  }
</style>
</head>
<body>
${nav}
<div class="viewer-shell">
  <p id="status">Decrypting shared content...</p>
  <iframe id="content" hidden sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"></iframe>
</div>
${footer}
<script>${viewerScript(id, nonce, metadata)}</script>
</body>
</html>`;
}