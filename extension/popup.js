// Popup script for Oh My Share Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabs = document.querySelectorAll('.tab');
  const selectionTab = document.getElementById('selection-tab');
  const codeTab = document.getElementById('code-tab');
  const authTab = document.getElementById('auth-tab');
  const codeInput = document.getElementById('codeInput');
  const language = document.getElementById('language');
  const filename = document.getElementById('filename');
  const shareSelection = document.getElementById('shareSelection');
  const shareCode = document.getElementById('shareCode');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const result = document.getElementById('result');
  const shareUrl = document.getElementById('shareUrl');
  const copyBtn = document.getElementById('copyBtn');
  const openBtn = document.getElementById('openBtn');
  const newShare = document.getElementById('newShare');
  
  // Auth elements
  const authForm = document.getElementById('authForm');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authSubmit = document.getElementById('authSubmit');
  const authMessage = document.getElementById('authMessage');
  const logoutBtn = document.getElementById('logoutBtn');
  const accountEmail = document.getElementById('accountEmail');
  const authView = document.getElementById('authView');
  const accountView = document.getElementById('accountView');
  
  // State
  let currentTab = 'selection';
  let selectedHtml = null;
  let authToken = null;
  
  // Initialize
  loadAuthToken();
  
  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      
      selectionTab.style.display = currentTab === 'selection' ? 'block' : 'none';
      codeTab.style.display = currentTab === 'code' ? 'block' : 'none';
      authTab.style.display = currentTab === 'auth' ? 'block' : 'none';
    });
  });
  
  // Selection mode
  shareSelection.addEventListener('click', async () => {
    if (selectedHtml) {
      // Already have selection, upload it
      showLoading();
      try {
        const result = await uploadContent(selectedHtml, 'html');
        showResult(result.url);
        selectedHtml = null;
      } catch (err) {
        showError(err.message || 'Failed to share selection');
      } finally {
        hideLoading();
      }
    } else {
      // Start selection mode
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });
        shareSelection.textContent = 'Click on element...';
        shareSelection.disabled = true;
      } catch (err) {
        showError('Could not connect to page. Try refreshing the page.');
      }
    }
  });
  
  // Listen for element selection
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'elementSelected') {
      selectedHtml = request.html;
      shareSelection.textContent = 'Share Selection';
      shareSelection.disabled = false;
    }
  });
  
  // Share code
  shareCode.addEventListener('click', async () => {
    const code = codeInput.value.trim();
    
    if (!code) {
      showError('Please enter some code');
      return;
    }
    
    showLoading();
    try {
      const result = await uploadContent(code, language.value);
      showResult(result.url);
    } catch (err) {
      showError(err.message || 'Failed to share code');
    } finally {
      hideLoading();
    }
  });
  
  // Copy URL
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareUrl.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
    }, 2000);
  });
  
  // Open URL
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: shareUrl.value });
  });
  
  // New share
  newShare.addEventListener('click', () => {
    hideResult();
    codeInput.value = '';
  });
  
  // Auth form submit
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = authEmail.value.trim();
    const password = authPassword.value;
    
    if (!email || !password) {
      showAuthMessage('Please enter email and password', true);
      return;
    }
    
    authSubmit.disabled = true;
    authSubmit.textContent = 'Logging in...';
    
    try {
      const response = await fetch('https://openanthropic.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'password',
          email,
          password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error_description || 'Login failed');
      }
      
      // Save token
      authToken = data.access_token;
      chrome.storage.local.set({ authToken });
      
      showAccountView(email);
      showAuthMessage('Login successful!', false);
    } catch (err) {
      showAuthMessage(err.message, true);
    } finally {
      authSubmit.disabled = false;
      authSubmit.textContent = 'Login';
    }
  });
  
  // Logout
  logoutBtn.addEventListener('click', () => {
    authToken = null;
    chrome.storage.local.remove('authToken');
    showAuthView();
  });
  
  // Upload content
  async function uploadContent(content, lang) {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch('https://openanthropic.com/api/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: content,
        language: lang || 'html',
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Upload failed');
    }
    
    return result;
  }
  
  // Load auth token
  function loadAuthToken() {
    chrome.storage.local.get(['authToken'], (result) => {
      if (result.authToken) {
        authToken = result.authToken;
        // Verify token
        verifyToken();
      }
    });
  }
  
  // Verify token
  async function verifyToken() {
    try {
      const response = await fetch('https://openanthropic.com/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        showAccountView(data.email);
      } else {
        // Token invalid
        authToken = null;
        chrome.storage.local.remove('authToken');
        showAuthView();
      }
    } catch {
      // Keep token for now
    }
  }
  
  // Show account view
  function showAccountView(email) {
    authView.style.display = 'none';
    accountView.style.display = 'block';
    accountEmail.textContent = email;
  }
  
  // Show auth view
  function showAuthView() {
    authView.style.display = 'block';
    accountView.style.display = 'none';
    authEmail.value = '';
    authPassword.value = '';
    authMessage.textContent = '';
  }
  
  // Show auth message
  function showAuthMessage(message, isError) {
    authMessage.textContent = message;
    authMessage.style.color = isError ? '#ff5c7c' : '#5ce1d4';
  }
  
  // UI helpers
  function showLoading() {
    loading.classList.add('show');
    error.classList.remove('show');
    result.classList.remove('show');
  }
  
  function hideLoading() {
    loading.classList.remove('show');
  }
  
  function showError(message) {
    error.textContent = message;
    error.classList.add('show');
  }
  
  function showResult(url) {
    shareUrl.value = url;
    result.classList.add('show');
    error.classList.remove('show');
  }
  
  function hideResult() {
    result.classList.remove('show');
  }
});
