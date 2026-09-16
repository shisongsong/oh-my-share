// Background service worker

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
    // Upload directly
    const result = await upload(content, title);
    // Store result and open popup
    await chrome.storage.local.set({ shareResult: result });
    chrome.action.openPopup();
  }
});

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
});

async function upload(content, title) {
  const res = await fetch('https://openanthropic.com/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: content, language: 'html', title })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}
