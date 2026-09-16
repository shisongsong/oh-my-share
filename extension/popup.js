// Popup script for Oh My Share Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const pendingBanner = document.getElementById('pendingBanner');
  const pendingPreview = document.getElementById('pendingPreview');
  const quickActions = document.getElementById('quickActions');
  const editor = document.getElementById('editor');
  const codeInput = document.getElementById('codeInput');
  const language = document.getElementById('language');
  const shareBtn = document.getElementById('shareBtn');
  const pageBtn = document.getElementById('pageBtn');
  const selectionBtn = document.getElementById('selectionBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const shareUrl = document.getElementById('shareUrl');
  const copyBtn = document.getElementById('copyBtn');
  const openBtn = document.getElementById('openBtn');
  const newBtn = document.getElementById('newBtn');
  const error = document.getElementById('error');
  const errorText = document.getElementById('errorText');
  const userBadge = document.getElementById('userBadge');
  const userEmail = document.getElementById('userEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const loginSubmit = document.getElementById('loginSubmit');
  const loginError = document.getElementById('loginError');
  const githubLogin = document.getElementById('githubLogin');
  const googleLogin = document.getElementById('googleLogin');

  let authToken = null;
  let pendingContent = null;

  // Initialize
  loadAuth();

  // Check for pending share
  chrome.storage.local.get(['pendingShare'], (data) => {
    if (data.pendingShare) {
      pendingContent = data.pendingShare;
      pendingPreview.textContent = data.pendingShare.content.slice(0, 100) + '...';
      pendingBanner.classList.add('show');
      quickActions.style.display = 'none';
    }
  });

  // Load auth token
  function loadAuth() {
    chrome.storage.local.get(['authToken'], (data) => {
      if (data.authToken) {
        authToken = data.authToken;
        verifyToken();
      }
    });
  }

  // Verify token
  async function verifyToken() {
    try {
      const response = await fetch('https://openanthropic.com/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        showLoggedIn(data.email);
      } else {
        logout();
      }
    } catch {
      // Keep token
    }
  }

  // Show logged in state
  function showLoggedIn(email) {
    userBadge.classList.add('show');
    userEmail.textContent = email;
  }

  // Show logged out state
  function showLoggedOut() {
    userBadge.classList.remove('show');
    userEmail.textContent = '';
  }

  // Logout
  function logout() {
    authToken = null;
    chrome.storage.local.remove('authToken');
    showLoggedOut();
  }

  // Current page - extract HTML
  pageBtn.addEventListener('click', async () => {
    showLoading();
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.runtime.sendMessage({
        action: 'getPageContent',
        tabId: tab.id
      });
      
      if (response.content) {
        pendingContent = { content: response.content, title: tab.title };
        quickActions.style.display = 'none';
        pendingPreview.textContent = response.content.slice(0, 100) + '...';
        pendingBanner.classList.add('show');
        hideLoading();
      } else {
        showError('Could not extract page content');
      }
    } catch (e) {
      showError('Failed to get page content');
    }
  });

  // Select element
  selectionBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject selection script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          window.__ohMyShareCallback = (html) => {
            chrome.runtime.sendMessage({ action: 'elementSelected', content: html });
          };
          
          document.body.style.cursor = 'crosshair';
          
          const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove handler
            document.removeEventListener('click', handler, true);
            document.body.style.cursor = '';
            
            // Get element HTML
            const el = e.target;
            window.__ohMyShareCallback(el.outerHTML);
          };
          
          document.addEventListener('click', handler, true);
        }
      });
      
      selectionBtn.textContent = 'Click on element...';
      selectionBtn.disabled = true;
    } catch (e) {
      showError('Could not connect to page');
    }
  });

  // Listen for element selection
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'elementSelected') {
      pendingContent = { content: request.content, title: 'Selected element' };
      quickActions.style.display = 'none';
      pendingPreview.textContent = request.content.slice(0, 100) + '...';
      pendingBanner.classList.add('show');
      selectionBtn.textContent = 'Select Element';
      selectionBtn.disabled = false;
    }
  });

  // Paste code
  pasteBtn.addEventListener('click', () => {
    quickActions.style.display = 'none';
    editor.classList.add('show');
    codeInput.focus();
  });

  // Share
  shareBtn.addEventListener('click', async () => {
    const content = pendingContent ? pendingContent.content : codeInput.value.trim();
    const title = pendingContent ? pendingContent.title : '';

    if (!content) {
      showError('Please enter some code');
      return;
    }

    showLoading();
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'upload',
        content,
        title,
        authToken
      });

      if (response.success) {
        pendingContent = null;
        chrome.storage.local.remove('pendingShare');
        showResult(response.url);
      } else {
        showError(response.error);
      }
    } catch (e) {
      showError('Failed to share');
    }
  });

  // Copy
  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(shareUrl.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
  });

  // Open
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: shareUrl.value });
  });

  // New share
  newBtn.addEventListener('click', () => {
    result.classList.remove('show');
    quickActions.style.display = 'grid';
    editor.classList.remove('show');
    codeInput.value = '';
    pendingContent = null;
  });

  // Login form
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Logging in...';
    loginError.classList.remove('show');

    try {
      const response = await fetch('https://openanthropic.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'password',
          email: email.value,
          password: password.value,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || 'Login failed');

      authToken = data.access_token;
      chrome.storage.local.set({ authToken });
      showLoggedIn(email.value);
      loginModal.classList.remove('show');
      loginForm.reset();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.add('show');
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Login';
    }
  });

  // GitHub login
  githubLogin.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://openanthropic.com/oauth/github' });
    loginModal.classList.remove('show');
  });

  // Google login
  googleLogin.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://openanthropic.com/oauth/google' });
    loginModal.classList.remove('show');
  });

  // Logout
  logoutBtn.addEventListener('click', logout);

  // UI helpers
  function showLoading() {
    quickActions.style.display = 'none';
    editor.classList.remove('show');
    pendingBanner.classList.remove('show');
    loading.classList.add('show');
    error.classList.remove('show');
    result.classList.remove('show');
  }

  function hideLoading() {
    loading.classList.remove('show');
    quickActions.style.display = 'grid';
  }

  function showResult(url) {
    loading.classList.remove('show');
    shareUrl.value = url;
    result.classList.add('show');
  }

  function showError(msg) {
    loading.classList.remove('show');
    errorText.textContent = msg;
    error.classList.add('show');
  }
});
