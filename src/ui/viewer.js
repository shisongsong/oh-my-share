import { safeViewerMetadata } from '../encryption.js';

function viewerScript(id, metadata) {
  const endpoint = `/api/content/${encodeURIComponent(id)}`;
  return `
const metadata = ${safeViewerMetadata(metadata)};
const endpoint = ${JSON.stringify(endpoint)};

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
    status.textContent = error.message || 'Unable to decrypt this content.';
    status.className = 'error';
  }
}

renderDecryptedDocument();`;
}

export function renderEncryptedViewer(id, metadata) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Oh My Share</title>
<style>
  :root { color-scheme: light; font-family: system-ui, sans-serif; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f6f8; color: #24313d; }
  #status { padding: 1.5rem; }
  #status.error { color: #a32626; }
  iframe { width: 100%; min-height: 100vh; border: 0; background: white; }
</style>
</head>
<body>
<p id="status">Decrypting shared content...</p>
<iframe id="content" hidden sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"></iframe>
<script>${viewerScript(id, metadata)}</script>
</body>
</html>`;
}