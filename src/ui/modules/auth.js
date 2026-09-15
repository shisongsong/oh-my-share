import { state } from './state.js';
import { t } from './i18n.js';
import { get, post } from './api.js';
import { loadAssets } from './assets.js';

export async function loadCurrentUser() {
  try {
    const data = await get('/api/auth/me');
    state.user = data.user;
    state.canEncrypt = data.canEncrypt === true;
  } catch {
    state.user = null;
    state.canEncrypt = false;
  }
  renderAccount();
}

export function renderAccount() {
  const accountButton = document.getElementById('accountBtn');
  const authView = document.getElementById('authView');
  const accountView = document.getElementById('accountView');

  if (state.user) {
    accountButton.textContent = state.user.email;
    authView.hidden = true;
    accountView.hidden = false;
    document.getElementById('accountEmail').textContent = state.user.email;
    loadAssets();
  } else {
    accountButton.textContent = t('accountBtn');
    authView.hidden = false;
    accountView.hidden = true;
  }
  updateEncryptionControls();
  
  if (window.updateUpgradeVisibility) {
    window.updateUpgradeVisibility(state.canEncrypt);
  }
}

export function updateEncryptionControls() {
  const toggle = document.getElementById('encryptToggle');
  const status = document.getElementById('encryptStatus');
  const details = document.getElementById('encryptDetails');
  const passphrase = document.getElementById('passphraseInput');

  toggle.disabled = !state.canEncrypt;

  if (!state.user) {
    status.textContent = t('encryptSignIn');
  } else if (!state.canEncrypt) {
    status.textContent = t('encryptPaidRequired');
  } else {
    status.textContent = t('encryptReady');
  }

  if (!state.canEncrypt) toggle.checked = false;
  details.hidden = !toggle.checked;
  passphrase.hidden = !toggle.checked || document.getElementById('keyMode').value !== 'passphrase';
}

export function updateAuthMode() {
  const register = state.authMode === 'register';
  document.getElementById('authModeTitle').textContent = register ? t('registerTitle') : t('loginTitle');
  document.getElementById('authSubmit').textContent = register ? t('registerSubmit') : t('loginSubmit');
  document.getElementById('authModeSwitch').textContent = register ? t('switchToLogin') : t('switchToRegister');
  document.getElementById('authPassword').autocomplete = register ? 'new-password' : 'current-password';
}

export async function submitAuth(event) {
  event.preventDefault();
  const button = document.getElementById('authSubmit');
  const message = document.getElementById('authMessage');

  button.disabled = true;
  message.textContent = '';

  try {
    const data = await post('/api/auth/' + state.authMode, {
      email: document.getElementById('authEmail').value,
      password: document.getElementById('authPassword').value,
    });
    state.user = data.user;
    state.canEncrypt = false;
    await loadCurrentUser();
    document.getElementById('authPassword').value = '';
  } catch (error) {
    message.textContent = error.message || t('authError');
  } finally {
    button.disabled = false;
  }
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  state.user = null;
  state.canEncrypt = false;
  renderAccount();
}

export function openAccountModal() {
  document.getElementById('accountModal').classList.add('active');
  if (state.user) loadAssets();
}

export function closeAccountModal() {
  document.getElementById('accountModal').classList.remove('active');
  document.getElementById('authMessage').textContent = '';
}

export function initAuth() {
  document.getElementById('accountBtn').addEventListener('click', openAccountModal);
  document.getElementById('accountClose').addEventListener('click', closeAccountModal);
  document.getElementById('authForm').addEventListener('submit', submitAuth);
  document.getElementById('authModeSwitch').addEventListener('click', () => {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    updateAuthMode();
    document.getElementById('authMessage').textContent = '';
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('encryptToggle').addEventListener('change', updateEncryptionControls);
  document.getElementById('keyMode').addEventListener('change', updateEncryptionControls);
  document.getElementById('accountModal').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeAccountModal();
  });
  document.getElementById('oauthLoginBtn').addEventListener('click', startOAuthLogin);

  updateAuthMode();
  loadCurrentUser();
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function startOAuthLogin() {
  window.location.href = '/oauth/login';
}
