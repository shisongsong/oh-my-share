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
  const pasteBtn = document.getElementById('pasteBtn');
  const pageBtn = document.getElementById('pageBtn');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const shareUrl = document.getElementById('shareUrl');
  const copyBtn = document.getElementById('copyBtn');
  const openBtn = document.getElementById('openBtn');
  const newBtn = document.getElementById('newBtn');
  const error = document.getElementById('error');
  const errorText = document.getElementById('errorText');

  let pendingContent = null;

  // Check for pending share from context menu
  chrome.storage.local.get(['pendingShare'], (data) => {
    if (data.pendingShare) {
      pendingContent = data.pendingShare;
      pendingPreview.textContent = data.pendingShare.content.slice(0, 100) + '...';
      pendingBanner.classList.add('show');
      quickActions.style.display = 'none';
    }
  });

  // Paste code
  pasteBtn.addEventListener('click', () => {
    quickActions.style.display = 'none';
    editor.classList.add('show');
    codeInput.focus();
  });

  // Current page
  pageBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    showLoading();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'upload',
        content: `<!-- ${tab.title} - ${tab.url} -->`,
        title: tab.title,
      });

      if (response.success) {
        showResult(response.url);
      } else {
        showError(response.error);
      }
    } catch (e) {
      showError('Failed to share page');
    }
  });

  // Share pending or editor content
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

  // Copy URL
  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(shareUrl.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
  });

  // Open URL
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

  // UI helpers
  function showLoading() {
    quickActions.style.display = 'none';
    editor.classList.remove('show');
    pendingBanner.classList.remove('show');
    loading.classList.add('show');
    error.classList.remove('show');
    result.classList.remove('show');
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
