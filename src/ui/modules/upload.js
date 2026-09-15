import { t } from './i18n.js';
import { postForm } from './api.js';

function bytesToBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function encryptPayload(source, keyMode) {
  const bytes = new Uint8Array(await source.arrayBuffer());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  let key;
  let fragmentKey;
  const metadata = {
    version: 1,
    algorithm: 'AES-GCM',
    keyMode: keyMode,
    iv: bytesToBase64Url(iv),
  };

  if (keyMode === 'random') {
    key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt']
    );
    fragmentKey = bytesToBase64Url(await crypto.subtle.exportKey('raw', key));
  } else {
    const passphrase = document.getElementById('passphraseInput').value;
    if (!passphrase) throw new Error(t('keyRequired'));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const material = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    const iterations = 210000;
    key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    metadata.salt = bytesToBase64Url(salt);
    metadata.iterations = iterations;
    fragmentKey = bytesToBase64Url(new TextEncoder().encode(passphrase));
  }

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes);
  return {
    blob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    metadata: metadata,
    keyFragment: '#key=' + fragmentKey,
  };
}

export async function createUploadPayload(kind, value, filename, slug) {
  if (document.getElementById('encryptToggle').checked &&
      (!window.crypto || !window.crypto.subtle)) {
    throw new Error('Encryption requires a secure context (HTTPS)');
  }

  const formData = new FormData();
  formData.append('slug', slug);

  const title = document.getElementById('metaTitle').value.trim();
  const description = document.getElementById('metaDescription').value.trim();
  const tags = document.getElementById('metaTags').value.trim();
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);
  if (tags) formData.append('tags', tags);

  const password = document.getElementById('sharePassword').value;
  const expiresIn = document.getElementById('expirySelect').value;
  if (password) formData.append('password', password);
  if (expiresIn && expiresIn !== '0') formData.append('expiresIn', expiresIn);

  if (!document.getElementById('encryptToggle').checked) {
    if (kind === 'code') formData.append('code', value);
    else formData.append('file', value, filename);
    return { formData, keyFragment: '' };
  }

  const encrypted = await encryptPayload(
    kind === 'code' ? new Blob([value], { type: 'text/html' }) : value,
    document.getElementById('keyMode').value
  );
  formData.append('encrypted', '1');
  formData.append('encryption_metadata', JSON.stringify(encrypted.metadata));
  formData.append('file', encrypted.blob, filename || 'encrypted.html');
  return { formData, keyFragment: encrypted.keyFragment };
}

export async function handleUpload(buildPayload, button) {
  const originalHTML = button.innerHTML;
  const translations = t('btnGenerating');

  button.innerHTML = '<div class="spinner"></div> ' + translations;
  button.disabled = true;
  button.dataset.loading = 'true';

  const resultBox = document.getElementById('resultBox');
  const resultTitle = document.getElementById('resultTitle');
  const resultUrl = document.getElementById('resultUrl');
  const resultHint = document.getElementById('resultHint');

  try {
    const prepared = await buildPayload();
    const data = await postForm('/api/upload', prepared.formData);

    resultBox.style.display = 'block';
    resultBox.className = 'result-box success';
    resultTitle.textContent = t('successMsg');
    resultUrl.value = data.url + (prepared.keyFragment || '');
    resultHint.textContent = prepared.keyFragment ? t('keyOnceMsg') : t('manageHint');
  } catch (error) {
    resultBox.style.display = 'block';
    resultBox.className = 'result-box error';
    resultTitle.textContent = '\u274c ' + error.message;
    resultUrl.value = '';
    resultHint.textContent = '';
  } finally {
    button.innerHTML = originalHTML;
    button.disabled = false;
    button.dataset.loading = 'false';
  }
}

function updateDropZoneText(name) {
  const dropZone = document.getElementById('dropZone');
  const paragraph = dropZone.querySelector('p');
  paragraph.innerHTML = '<span>' + t('selectedPrefix') + '</span><span class="link"></span>';
  paragraph.querySelector('.link').textContent = name;
  dropZone.querySelector('svg').style.color = 'var(--text-main)';
}

export function initUpload() {
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    if (event.dataTransfer.files.length) {
      fileInput.files = event.dataTransfer.files;
      updateDropZoneText(event.dataTransfer.files[0].name);
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) updateDropZoneText(fileInput.files[0].name);
  });

  document.getElementById('btn-file').addEventListener('click', function () {
    if (!fileInput.files.length) { alert(t('errEmptyFile')); return; }
    const file = fileInput.files[0];
    const slug = document.getElementById('slug-file').value;
    handleUpload(() => createUploadPayload('file', file, file.name, slug), this);
  });

  document.getElementById('btn-code').addEventListener('click', function () {
    const code = document.getElementById('codeInput').value.trim();
    if (!code) { alert(t('errEmptyCode')); return; }
    const slug = document.getElementById('slug-code').value;
    handleUpload(() => createUploadPayload('code', code, 'pasted-code.html', slug), this);
  });
}
