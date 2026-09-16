// Background service worker for Oh My Share Chrome Extension

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  // Share selected text
  chrome.contextMenus.create({
    id: 'share-selection',
    title: 'Share selection with Oh My Share',
    contexts: ['selection']
  });
  
  // Share link
  chrome.contextMenus.create({
    id: 'share-link',
    title: 'Share link with Oh My Share',
    contexts: ['link']
  });
  
  // Share image
  chrome.contextMenus.create({
    id: 'share-image',
    title: 'Share image with Oh My Share',
    contexts: ['image']
  });
  
  // Share page
  chrome.contextMenus.create({
    id: 'share-page',
    title: 'Share this page with Oh My Share',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let content = '';
  let title = '';
  
  switch (info.menuItemId) {
    case 'share-selection':
      content = info.selectionText;
      title = 'Shared text';
      break;
      
    case 'share-link':
      content = `<a href="${info.linkUrl}">${info.linkUrl}</a>`;
      title = info.linkUrl;
      break;
      
    case 'share-image':
      content = `<img src="${info.srcUrl}" alt="${info.srcUrl}">`;
      title = 'Shared image';
      break;
      
    case 'share-page':
      content = `<a href="${tab.url}">${tab.title}</a>`;
      title = tab.title;
      break;
  }
  
  if (content) {
    // Store content and open popup
    await chrome.storage.local.set({ 
      pendingShare: { content, title } 
    });
    
    // Open popup
    chrome.action.openPopup();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'upload') {
    uploadContent(request.content, request.title, request.authToken)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Upload content to Oh My Share
async function uploadContent(content, title, authToken) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch('https://openanthropic.com/api/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: content,
      language: 'html',
      title: title || '',
    }),
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Upload failed');
  }
  
  return result;
}
