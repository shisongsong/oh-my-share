// Side panel script

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  const codeInput = document.getElementById('codeInput');
  const shareBtn = document.getElementById('shareBtn');
  const sharePageBtn = document.getElementById('sharePageBtn');
  const pageTitle = document.getElementById('pageTitle');
  const pageUrl = document.getElementById('pageUrl');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const shareUrl = document.getElementById('shareUrl');
  const copyBtn = document.getElementById('copyBtn');
  const openBtn = document.getElementById('openBtn');
  const newBtn = document.getElementById('newBtn');
  const error = document.getElementById('error');
  const errorText = document.getElementById('errorText');
  const loginBtn = document.getElementById('loginBtn');
  const userInfo = document.getElementById('userInfo');
  const userEmail = document.getElementById('userEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('loginError');
  const githubLogin = document.getElementById('githubLogin');
  const googleLogin = document.getElementById('googleLogin');

  let authToken = null;

  init();
  loadCurrentTab();
  checkPendingResult();

  function init() {
    chrome.storage.local.get(['authToken'], async (data) => {
      if (data.authToken) {
        authToken = data.authToken;
        verifyToken();
      } else {
        // Try to get session cookie directly
        try {
          const cookies = await chrome.cookies.getAll({ url: 'https://openanthropic.com' });
          const session = cookies.find(c => c.name === 'osh_session');
          if (session && session.value) {
            authToken = session.value;
            chrome.storage.local.set({ authToken });
            verifyToken();
          }
        } catch {}
      }
    });
  }

  async function verifyToken() {
    try {
      const res = await fetch('https://openanthropic.com/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        showLoggedIn(data.email);
      } else {
        logout();
      }
    } catch {}
  }

  function showLoggedIn(email) {
    loginBtn.style.display = 'none';
    userInfo.classList.add('show');
    userEmail.textContent = email;
  }

  function logout() {
    authToken = null;
    chrome.storage.local.remove('authToken');
    loginBtn.style.display = '';
    userInfo.classList.remove('show');
  }

  async function loadCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    pageTitle.textContent = tab.title || 'Untitled';
    pageUrl.textContent = tab.url || '';
  }

  function checkPendingResult() {
    chrome.storage.local.get(['shareResult'], (data) => {
      if (data.shareResult && data.shareResult.url) {
        showResult(data.shareResult.url);
        chrome.storage.local.remove('shareResult');
      } else if (data.shareResult && data.shareResult.error) {
        showError(data.shareResult.error);
        chrome.storage.local.remove('shareResult');
      }
    });
  }

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + '-panel').classList.add('active');
    });
  });

  // Share code
  shareBtn.addEventListener('click', async () => {
    const content = codeInput.value.trim();
    if (!content) return showError('Please enter some code');

    showLoading();
    const res = await chrome.runtime.sendMessage({
      action: 'upload',
      content,
      title: ''
    });
    hideLoading();

    if (res.success) {
      showResult(res.url);
      codeInput.value = '';
    } else {
      showError(res.error);
    }
  });

  // Share page
  sharePageBtn.addEventListener('click', async () => {
    showLoading();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const pageRes = await chrome.runtime.sendMessage({
      action: 'getPageContent',
      tabId: tab.id
    });

    if (!pageRes.content) {
      hideLoading();
      return showError('Could not get page content');
    }

    const uploadRes = await chrome.runtime.sendMessage({
      action: 'upload',
      content: pageRes.content,
      title: tab.title
    });
    hideLoading();

    if (uploadRes.success) {
      showResult(uploadRes.url);
    } else {
      showError(uploadRes.error);
    }
  });

  // Copy
  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(shareUrl.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy', 2000);
  });

  // Open
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: shareUrl.value });
  });

  // New
  newBtn.addEventListener('click', () => {
    result.classList.remove('show');
    error.classList.remove('show');
  });

  // Login modal
  loginBtn.addEventListener('click', () => loginModal.classList.add('show'));
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) loginModal.classList.remove('show');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.remove('show');

    try {
      const res = await fetch('https://openanthropic.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'password',
          email: emailInput.value,
          password: passwordInput.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || 'Login failed');

      authToken = data.access_token;
      chrome.storage.local.set({ authToken });
      showLoggedIn(emailInput.value);
      loginModal.classList.remove('show');
      loginForm.reset();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.add('show');
    }
  });

  githubLogin.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://openanthropic.com/oauth/github' });
    loginModal.classList.remove('show');
    chrome.runtime.sendMessage({ action: 'startOAuthPoll' });
  });

  googleLogin.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://openanthropic.com/oauth/google' });
    loginModal.classList.remove('show');
    chrome.runtime.sendMessage({ action: 'startOAuthPoll' });
  });

  logoutBtn.addEventListener('click', logout);

  // Listen for OAuth completion
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'oauthComplete') {
      init();
    }
  });

  // UI helpers
  function showLoading() {
    loading.classList.add('show');
    error.classList.remove('show');
    result.classList.remove('show');
  }

  function hideLoading() {
    loading.classList.remove('show');
  }

  function showResult(url) {
    shareUrl.value = url;
    result.classList.add('show');
    error.classList.remove('show');
  }

  function showError(msg) {
    errorText.textContent = msg;
    error.classList.add('show');
  }
});
