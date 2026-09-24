// Background service worker

// Open side panel on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'share-selection',
    title: 'Share with Oh My Share',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'share-link',
    title: 'Share link with Oh My Share',
    contexts: ['link']
  });
  chrome.contextMenus.create({
    id: 'share-image',
    title: 'Share image with Oh My Share',
    contexts: ['image']
  });
  chrome.contextMenus.create({
    id: 'share-page',
    title: 'Share this page with Oh My Share',
    contexts: ['page']
  });
});

// Context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let content = '';
  let title = '';
  
  if (info.menuItemId === 'share-selection') {
    content = info.selectionText;
    title = 'Shared text';
  } else if (info.menuItemId === 'share-link') {
    content = `<a href="${info.linkUrl}">${info.linkUrl}</a>`;
    title = info.linkUrl;
  } else if (info.menuItemId === 'share-image') {
    content = `<img src="${info.srcUrl}">`;
    title = 'Shared image';
  } else if (info.menuItemId === 'share-page') {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML
      });
      content = results[0]?.result || '';
      title = tab.title;
    } catch {
      content = `<a href="${tab.url}">${tab.title}</a>`;
      title = tab.title;
    }
  }
  
  if (content) {
    const result = await upload(content, title).catch(e => ({ error: e.message }));
    await chrome.storage.local.set({ shareResult: result });
    // Open side panel
    if (tab) {
      await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    }
  }
});

// Messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      func: () => document.documentElement.outerHTML
    }).then(r => sendResponse({ content: r[0]?.result || '' }))
      .catch(() => sendResponse({ content: '' }));
    return true;
  }
  if (request.action === 'upload') {
    upload(request.content, request.title || '')
      .then(r => sendResponse({ success: true, ...r }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (request.action === 'startOAuthPoll') {
    startOAuthPoll();
    sendResponse({ ok: true });
    return false;
  }
});

// OAuth cookie polling
let oauthPolling = false;
function startOAuthPoll() {
  if (oauthPolling) return;
  oauthPolling = true;
  
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    if (attempts > 60) { clearInterval(interval); oauthPolling = false; return; }

    try {
      const cookies = await chrome.cookies.getAll({ domain: 'openanthropic.com' });
      const session = cookies.find(c => c.name === 'osh_session');
      if (session && session.value) {
        clearInterval(interval);
        oauthPolling = false;
        await chrome.storage.local.set({ authToken: session.value });
        chrome.runtime.sendMessage({ action: 'oauthComplete' }).catch(() => {});
      }
    } catch {}
  }, 1000);
}

// Upload
async function upload(content, title) {
  const { authToken } = await chrome.storage.local.get(['authToken']);
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  
  const res = await fetch('https://openanthropic.com/api/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({ code: content, language: 'html', title })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}
