export const CLIENT_SCRIPT = `
var I18N = JSON.parse(document.getElementById('i18n-data').textContent);
var currentLang = CURRENT_LANG;

function applyLang(lang) {
  var translations = I18N[lang];
  if (!translations) return;
  currentLang = lang;
  document.documentElement.lang = translations.htmlLang;
  document.title = 'Oh My Share - ' + translations.subtitle;
  var elements = document.querySelectorAll('[data-i18n]');
  for (var index = 0; index < elements.length; index++) {
    var element = elements[index];
    var key = element.getAttribute('data-i18n');
    var value = translations[key];
    if (value === undefined) continue;
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = value;
    } else if (element.dataset.loading === 'true') {
      continue;
    } else {
      element.textContent = value;
    }
  }
  var langButtonText = document.getElementById('langBtnText');
  if (langButtonText) langButtonText.textContent = lang === 'zh' ? 'EN' : '中文';
  if (typeof accountState !== 'undefined' && accountState) {
    updateAuthMode();
    renderAccount();
  }
}

function toggleLang() {
  applyLang(currentLang === 'zh' ? 'en' : 'zh');
}

applyLang(currentLang);

var accountState = { user: null, canEncrypt: false };
var authMode = 'login';

function currentTranslations() {
  return I18N[currentLang];
}

function updateEncryptionControls() {
  var translations = currentTranslations();
  var toggle = document.getElementById('encryptToggle');
  var status = document.getElementById('encryptStatus');
  var details = document.getElementById('encryptDetails');
  var passphrase = document.getElementById('passphraseInput');
  toggle.disabled = !accountState.canEncrypt;
  if (!accountState.user) status.textContent = translations.encryptSignIn;
  else if (!accountState.canEncrypt) status.textContent = translations.encryptPaidRequired;
  else status.textContent = translations.encryptReady;
  if (!accountState.canEncrypt) toggle.checked = false;
  details.hidden = !toggle.checked;
  passphrase.hidden = !toggle.checked || document.getElementById('keyMode').value !== 'passphrase';
}

function renderAccount() {
  var translations = currentTranslations();
  var accountButton = document.getElementById('accountBtn');
  var authView = document.getElementById('authView');
  var accountView = document.getElementById('accountView');
  if (accountState.user) {
    accountButton.textContent = accountState.user.email;
    authView.hidden = true;
    accountView.hidden = false;
    document.getElementById('accountEmail').textContent = accountState.user.email;
    loadAssets();
  } else {
    accountButton.textContent = translations.accountBtn;
    authView.hidden = false;
    accountView.hidden = true;
  }
  updateEncryptionControls();
}

async function readApiResponse(response) {
  var text = await response.text();
  var data;
  try { data = JSON.parse(text); } catch (error) { data = { error: text }; }
  if (!response.ok) throw new Error(data.error || currentTranslations().authError);
  return data;
}

async function loadCurrentUser() {
  try {
    var response = await fetch('/api/auth/me', { headers: { Accept: 'application/json' } });
    var data = await readApiResponse(response);
    accountState.user = data.user;
    accountState.canEncrypt = data.canEncrypt === true;
  } catch (error) {
    accountState.user = null;
    accountState.canEncrypt = false;
  }
  renderAccount();
}

function openAccountModal() {
  document.getElementById('accountModal').classList.add('active');
  if (accountState.user) loadAssets();
}

function closeAccountModal() {
  document.getElementById('accountModal').classList.remove('active');
  document.getElementById('authMessage').textContent = '';
}

function updateAuthMode() {
  var translations = currentTranslations();
  var register = authMode === 'register';
  document.getElementById('authModeTitle').textContent = register ? translations.registerTitle : translations.loginTitle;
  document.getElementById('authSubmit').textContent = register ? translations.registerSubmit : translations.loginSubmit;
  document.getElementById('authModeSwitch').textContent = register ? translations.switchToLogin : translations.switchToRegister;
  document.getElementById('authPassword').autocomplete = register ? 'new-password' : 'current-password';
}

async function submitAuth(event) {
  event.preventDefault();
  var button = document.getElementById('authSubmit');
  var message = document.getElementById('authMessage');
  var translations = currentTranslations();
  button.disabled = true;
  message.textContent = '';
  try {
    var response = await fetch('/api/auth/' + authMode, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('authEmail').value,
        password: document.getElementById('authPassword').value,
      }),
    });
    var data = await readApiResponse(response);
    accountState.user = data.user;
    accountState.canEncrypt = false;
    await loadCurrentUser();
    document.getElementById('authPassword').value = '';
  } catch (error) {
    message.textContent = error.message || translations.authError;
  } finally {
    button.disabled = false;
  }
}

async function loadAssets() {
  if (!accountState.user) return;
  var list = document.getElementById('assetList');
  list.replaceChildren();
  try {
    var response = await fetch('/api/assets', { headers: { Accept: 'application/json' } });
    var data = await readApiResponse(response);
    if (!data.assets.length) {
      var empty = document.createElement('div');
      empty.className = 'asset-empty';
      empty.textContent = currentTranslations().assetsEmpty;
      list.appendChild(empty);
      return;
    }
    data.assets.forEach(function (asset) {
      var row = document.createElement('div');
      row.className = 'asset-row';
      var link = document.createElement('a');
      link.href = asset.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = asset.filename || asset.id;
      var type = document.createElement('small');
      type.textContent = asset.encrypted ? 'AES-GCM' : 'HTML';
      var deleteButton = document.createElement('button');
      deleteButton.className = 'asset-delete';
      deleteButton.type = 'button';
      deleteButton.textContent = currentTranslations().deleteAsset;
      deleteButton.addEventListener('click', function () { deleteAsset(asset.id); });
      row.appendChild(link);
      row.appendChild(type);
      row.appendChild(deleteButton);
      list.appendChild(row);
    });
  } catch (error) {
    var failed = document.createElement('div');
    failed.className = 'asset-empty';
    failed.textContent = error.message || currentTranslations().authError;
    list.appendChild(failed);
  }
}

async function deleteAsset(id) {
  if (!window.confirm(currentTranslations().deleteConfirm)) return;
  try {
    var response = await fetch('/api/assets/' + encodeURIComponent(id), { method: 'DELETE' });
    await readApiResponse(response);
    loadAssets();
  } catch (error) {
    window.alert(error.message || currentTranslations().authError);
  }
}

document.getElementById('accountBtn').addEventListener('click', openAccountModal);
document.getElementById('accountClose').addEventListener('click', closeAccountModal);
document.getElementById('authForm').addEventListener('submit', submitAuth);
document.getElementById('authModeSwitch').addEventListener('click', function () {
  authMode = authMode === 'login' ? 'register' : 'login';
  updateAuthMode();
  document.getElementById('authMessage').textContent = '';
});
document.getElementById('logoutBtn').addEventListener('click', async function () {
  await fetch('/api/auth/logout', { method: 'POST' });
  accountState.user = null;
  accountState.canEncrypt = false;
  renderAccount();
});
document.getElementById('encryptToggle').addEventListener('change', updateEncryptionControls);
document.getElementById('keyMode').addEventListener('change', updateEncryptionControls);
document.getElementById('accountModal').addEventListener('click', function (event) {
  if (event.target === this) closeAccountModal();
});

updateAuthMode();
loadCurrentUser();

var tabs = document.querySelectorAll('.tab');
var panels = document.querySelectorAll('.panel');
for (var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
  (function (tab) {
    tab.addEventListener('click', function () {
      for (var index = 0; index < tabs.length; index++) tabs[index].classList.remove('active');
      for (var panelIndex = 0; panelIndex < panels.length; panelIndex++) panels[panelIndex].classList.remove('active');
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
      document.getElementById('resultBox').style.display = 'none';
    });
  })(tabs[tabIndex]);
}

var dropZone = document.getElementById('dropZone');
var fileInput = document.getElementById('fileInput');
dropZone.addEventListener('click', function () { fileInput.click(); });
dropZone.addEventListener('dragover', function (event) {
  event.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', function (event) {
  event.preventDefault();
  dropZone.classList.remove('dragover');
  if (event.dataTransfer.files.length) {
    fileInput.files = event.dataTransfer.files;
    updateDropZoneText(event.dataTransfer.files[0].name);
  }
});
fileInput.addEventListener('change', function () {
  if (fileInput.files.length) updateDropZoneText(fileInput.files[0].name);
});

function updateDropZoneText(name) {
  var paragraph = dropZone.querySelector('p');
  paragraph.innerHTML = '<span>' + I18N[currentLang].selectedPrefix + '</span><span class="link"></span>';
  paragraph.querySelector('.link').textContent = name;
  dropZone.querySelector('svg').style.color = 'var(--text-main)';
}

function bytesToBase64Url(value) {
  var bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  var binary = '';
  for (var index = 0; index < bytes.length; index++) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
}

async function encryptPayload(source, keyMode) {
  var bytes = new Uint8Array(await source.arrayBuffer());
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var key;
  var fragmentKey;
  var metadata = {
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
    var passphrase = document.getElementById('passphraseInput').value;
    if (!passphrase) throw new Error(currentTranslations().keyRequired);
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var material = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    var iterations = 210000;
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

  var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes);
  return {
    blob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    metadata: metadata,
    keyFragment: '#key=' + fragmentKey,
  };
}

async function createUploadPayload(kind, value, filename, slug) {
  var formData = new FormData();
  formData.append('slug', slug);
  if (!document.getElementById('encryptToggle').checked) {
    if (kind === 'code') formData.append('code', value);
    else formData.append('file', value, filename);
    return { formData: formData, keyFragment: '' };
  }

  var encrypted = await encryptPayload(
    kind === 'code' ? new Blob([value], { type: 'text/html' }) : value,
    document.getElementById('keyMode').value
  );
  formData.append('encrypted', '1');
  formData.append('encryption_metadata', JSON.stringify(encrypted.metadata));
  formData.append('file', encrypted.blob, filename || 'encrypted.html');
  return { formData: formData, keyFragment: encrypted.keyFragment };
}

async function handleUpload(buildPayload, button) {
  var originalHTML = button.innerHTML;
  var translations = I18N[currentLang];
  button.innerHTML = '<div class="spinner"></div> ' + translations.btnGenerating;
  button.disabled = true;
  button.dataset.loading = 'true';

  var resultBox = document.getElementById('resultBox');
  var resultTitle = document.getElementById('resultTitle');
  var resultUrl = document.getElementById('resultUrl');
  var resultHint = document.getElementById('resultHint');

  try {
    var prepared = await buildPayload();
    var response = await fetch('/api/upload', { method: 'POST', body: prepared.formData });
    var text = await response.text();
    var data;
    try { data = JSON.parse(text); } catch (error) { data = { error: text }; }
    if (!response.ok) throw new Error(data.error || translations.errUpload);

      resultBox.style.display = 'block';
      resultBox.className = 'result-box success';
      resultTitle.textContent = translations.successMsg;
      resultUrl.value = data.url + (prepared.keyFragment || '');
      resultHint.textContent = prepared.keyFragment ? translations.keyOnceMsg : '';
  } catch (error) {
    resultBox.style.display = 'block';
    resultBox.className = 'result-box error';
    resultTitle.textContent = '\\u274c ' + error.message;
    resultUrl.value = '';
    resultHint.textContent = '';
  } finally {
    button.innerHTML = originalHTML;
    button.disabled = false;
    button.dataset.loading = 'false';
  }
}

document.getElementById('btn-file').addEventListener('click', function () {
  var translations = I18N[currentLang];
  if (!fileInput.files.length) { alert(translations.errEmptyFile); return; }
  var file = fileInput.files[0];
  var slug = document.getElementById('slug-file').value;
  handleUpload(function () {
    return createUploadPayload('file', file, file.name, slug);
  }, this);
});

document.getElementById('btn-code').addEventListener('click', function () {
  var translations = I18N[currentLang];
  var code = document.getElementById('codeInput').value.trim();
  if (!code) { alert(translations.errEmptyCode); return; }
  var slug = document.getElementById('slug-code').value;
  handleUpload(function () {
    return createUploadPayload('code', code, 'pasted-code.html', slug);
  }, this);
});

document.getElementById('copyBtn').addEventListener('click', function () {
  var urlInput = document.getElementById('resultUrl');
  if (!urlInput.value) return;
  var button = this;
  var translations = I18N[currentLang];
  navigator.clipboard.writeText(urlInput.value).then(function () {
    button.textContent = translations.copiedBtn;
    button.classList.add('copied');
    setTimeout(function () {
      button.textContent = translations.copyBtn;
      button.classList.remove('copied');
    }, 2000);
  }).catch(function () { alert(translations.errCopy); });
});

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function generateShareImage(url) {
  var translations = I18N[currentLang];
  if (typeof qrcode === 'undefined') { alert(translations.imgFail); return; }
  var qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  var image = new Image();
  image.onload = function () {
    var width = 640;
    var height = 900;
    var devicePixelRatio = 2;
    var canvas = document.getElementById('shareCanvas');
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = '100%';
    canvas.style.maxWidth = '380px';
    var context = canvas.getContext('2d');
    context.scale(devicePixelRatio, devicePixelRatio);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    var gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, 8);
    context.fillStyle = '#171717';
    context.font = 'bold 36px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('Oh My Share', width / 2, 90);
    context.fillStyle = '#666';
    context.font = '16px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif';
    context.fillText(translations.subtitle, width / 2, 130);
    var qrSize = 360;
    var qrX = (width - qrSize) / 2;
    var qrY = 200;
    context.fillStyle = '#f8fafc';
    roundedRect(context, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 16);
    context.fill();
    context.drawImage(image, qrX, qrY, qrSize, qrSize);
    context.fillStyle = '#171717';
    context.font = 'bold 20px -apple-system,sans-serif';
    context.fillText(translations.imageHint, width / 2, qrY + qrSize + 80);
    context.fillStyle = '#94a3b8';
    context.font = '14px ui-monospace,monospace';
    var displayUrl = url.length > 55 ? url.slice(0, 52) + '...' : url;
    context.fillText(displayUrl, width / 2, qrY + qrSize + 120);
    context.strokeStyle = '#e5e5e5';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(80, height - 100);
    context.lineTo(width - 80, height - 100);
    context.stroke();
    context.fillStyle = '#cbd5e1';
    context.font = '13px -apple-system,sans-serif';
    context.fillText('Powered by Cloudflare Workers', width / 2, height - 60);
    document.getElementById('imageModal').classList.add('active');
  };
  image.onerror = function () { alert(translations.imgFail); };
  image.src = qr.createDataURL(8, 0);
}

function closeImageModal() {
  document.getElementById('imageModal').classList.remove('active');
}

document.getElementById('imgBtn').addEventListener('click', function () {
  var urlInput = document.getElementById('resultUrl');
  if (urlInput.value) generateShareImage(urlInput.value);
});

document.getElementById('downloadBtn').addEventListener('click', function () {
  var canvas = document.getElementById('shareCanvas');
  if (!canvas.width) return;
  canvas.toBlob(function (blob) {
    var link = document.createElement('a');
    link.download = 'oh-my-share.png';
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }, 'image/png');
});

document.getElementById('imageModal').addEventListener('click', function (event) {
  if (event.target === this) closeImageModal();
});
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') closeImageModal();
});
`;