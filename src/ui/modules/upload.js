import { t } from './i18n.js';
import { postForm } from './api.js';
import { state } from './state.js';
import { openAccountModal, updateAuthMode } from './auth.js';

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

  const publishToggle = document.getElementById('publishToGallery');
  if (publishToggle && publishToggle.checked) formData.append('published', '1');

  const remixedFrom = document.getElementById('remixedFrom');
  if (remixedFrom && remixedFrom.value) formData.append('remixedFrom', remixedFrom.value);

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

export async function handleUpload(buildPayload, button, endpoint = '/api/upload') {
  const originalHTML = button.innerHTML;
  const translations = t('btnGenerating');

  button.innerHTML = '<div class="spinner"></div> ' + translations;
  button.disabled = true;
  button.dataset.loading = 'true';

  const resultBox = document.getElementById('resultBox');
  const resultUrl = document.getElementById('resultUrl');

  try {
    const prepared = await buildPayload();
    const data = await postForm(endpoint, prepared.formData);

    resultBox.hidden = false;
    resultBox.className = 'result-box';
    resultUrl.value = data.url + (prepared.keyFragment || '');
  } catch (error) {
    resultBox.hidden = false;
    resultBox.className = 'result-box error';
    resultUrl.value = '❌ ' + error.message;
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

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

let folderEntries = [];

function setFolderEntries(entries) {
  folderEntries = entries;
  const info = document.getElementById('folderInfo');
  if (!info) return;
  if (!entries.length) {
    info.hidden = true;
    info.textContent = '';
    return;
  }
  const total = entries.reduce((sum, entry) => sum + (entry.file.size || 0), 0);
  info.hidden = false;
  info.textContent = t('folderSelected')
    .replace('{n}', String(entries.length))
    .replace('{size}', formatBytes(total));
}

function collectFileList(files) {
  return Array.from(files).map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  }));
}

function readDirectory(reader) {
  return new Promise((resolve, reject) => {
    const all = [];
    const read = () => reader.readEntries((entries) => {
      if (!entries.length) resolve(all);
      else {
        all.push(...entries);
        read();
      }
    }, reject);
    read();
  });
}

async function walkEntry(entry, prefix, out) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    out.push({ file, path: `${prefix}${entry.name}` });
    return;
  }
  if (entry.isDirectory) {
    const children = await readDirectory(entry.createReader());
    for (const child of children) {
      await walkEntry(child, `${prefix}${entry.name}/`, out);
    }
  }
}

async function collectDroppedEntries(dataTransfer) {
  const items = dataTransfer.items;
  if (items && items.length && typeof items[0].webkitGetAsEntry === 'function') {
    const out = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry();
      if (entry) await walkEntry(entry, '', out);
    }
    if (out.length) return out;
  }
  return collectFileList(dataTransfer.files);
}

function buildFolderPayload() {
  const formData = new FormData();
  formData.append('folder', (folderEntries[0]?.path || 'site').split('/')[0]);

  const title = document.getElementById('metaTitle').value.trim();
  const description = document.getElementById('metaDescription').value.trim();
  const tags = document.getElementById('metaTags').value.trim();
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);
  if (tags) formData.append('tags', tags);

  const expiresIn = document.getElementById('expirySelect').value;
  if (expiresIn && expiresIn !== '0') formData.append('expiresIn', expiresIn);

  for (const entry of folderEntries) {
    formData.append('files', entry.file, entry.path);
  }
  return { formData, keyFragment: '' };
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
    const folderPanel = document.getElementById('panel-folder');
    if (folderPanel && folderPanel.classList.contains('active')) return;
    const codePanel = document.getElementById('panel-code');
    const slug = document.getElementById('slug-file').value;

    if (codePanel && codePanel.classList.contains('active')) {
      const code = document.getElementById('codeInput').value.trim();
      if (!code) { alert(t('errEmptyCode')); return; }
      handleUpload(() => createUploadPayload('code', code, 'pasted-code.html', slug), this);
      return;
    }

    if (!fileInput.files.length) { alert(t('errEmptyFile')); return; }
    const file = fileInput.files[0];
    handleUpload(() => createUploadPayload('file', file, file.name, slug), this);
  });

  const folderInput = document.getElementById('folderInput');
  const folderDropZone = document.getElementById('folderDropZone');
  if (folderInput && folderDropZone) {
    folderDropZone.addEventListener('click', (event) => {
      if (event.target !== folderInput) folderInput.click();
    });
    folderDropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      folderDropZone.classList.add('dragover');
    });
    folderDropZone.addEventListener('dragleave', () => folderDropZone.classList.remove('dragover'));
    folderDropZone.addEventListener('drop', async (event) => {
      event.preventDefault();
      folderDropZone.classList.remove('dragover');
      setFolderEntries(await collectDroppedEntries(event.dataTransfer));
    });
    folderInput.addEventListener('change', () => {
      setFolderEntries(collectFileList(folderInput.files));
    });
  }

  document.getElementById('btn-file').addEventListener('click', function () {
    const folderPanel = document.getElementById('panel-folder');
    if (!folderPanel || !folderPanel.classList.contains('active')) return;

    if (!folderEntries.length) { alert(t('errSiteEmpty')); return; }
    if (folderEntries.length > 200) { alert(t('errSiteTooMany')); return; }
    const total = folderEntries.reduce((sum, entry) => sum + (entry.file.size || 0), 0);
    if (total > 20 * 1024 * 1024) { alert(t('errSiteTooLarge')); return; }
    if (folderEntries.some((entry) => (entry.file.size || 0) > 5 * 1024 * 1024)) {
      alert(t('errSiteFileTooLarge'));
      return;
    }
    if (!state.user) {
      state.authMode = 'register';
      updateAuthMode();
      openAccountModal();
      alert(t('errSiteAuth'));
      return;
    }
    handleUpload(buildFolderPayload, this, '/api/upload-site');
  });
}
