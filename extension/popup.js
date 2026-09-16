// Popup script for Oh My Share Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const selectionTab = document.getElementById('selection-tab');
  const codeTab = document.getElementById('code-tab');
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

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      if (tab.dataset.tab === 'selection') {
        selectionTab.style.display = 'block';
        codeTab.style.display = 'none';
      } else {
        selectionTab.style.display = 'none';
        codeTab.style.display = 'block';
      }
    });
  });

  // Share selection
  shareSelection.addEventListener('click', async () => {
    showLoading();
    
    try {
      // Get selected element from content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedElement' });
      
      if (!response || !response.html) {
        showError('No element selected. Click on an element first, then try again.');
        return;
      }
      
      const result = await uploadContent(response.html, 'html');
      showResult(result.url);
    } catch (err) {
      showError(err.message || 'Failed to share selection');
    } finally {
      hideLoading();
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

  // Upload content
  async function uploadContent(content, lang) {
    const response = await fetch('https://openanthropic.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'upload',
          arguments: {
            content,
            language: lang || 'html',
          },
        },
        id: 1,
      }),
    });
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message || 'Upload failed');
    }
    
    // Parse the result content
    const text = result.result?.content?.[0]?.text;
    if (!text) {
      throw new Error('Invalid response');
    }
    
    return JSON.parse(text);
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
