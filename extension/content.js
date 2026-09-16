// Content script for Oh My Share Chrome Extension

let selectedElement = null;
let selectionHighlight = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedElement') {
    if (selectedElement) {
      sendResponse({ html: selectedElement.outerHTML });
    } else {
      sendResponse({ html: null });
    }
  }
  return true;
});

// Add click handler to select elements
document.addEventListener('click', (e) => {
  // Check if extension is active (popup is open)
  if (!chrome.runtime?.id) return;
  
  // Prevent default behavior
  e.preventDefault();
  e.stopPropagation();
  
  // Remove previous highlight
  if (selectionHighlight) {
    selectionHighlight.style.outline = '';
    selectionHighlight.style.outlineOffset = '';
  }
  
  // Select the clicked element
  selectedElement = e.target;
  
  // Highlight the selected element
  selectionHighlight = selectedElement;
  selectionHighlight.style.outline = '2px solid #ff5c7c';
  selectionHighlight.style.outlineOffset = '2px';
  
  // Store selection in chrome storage
  chrome.storage.local.set({ 
    selectedHtml: selectedElement.outerHTML,
    selectedTag: selectedElement.tagName.toLowerCase()
  });
}, true);

// Add right-click context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'share-html',
    title: 'Share with Oh My Share',
    contexts: ['selection', 'link', 'image']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'share-html') {
    let html = '';
    
    if (info.selectionText) {
      // Get the selected element
      html = info.selectionText;
    } else if (info.linkUrl) {
      // Share the link
      html = `<a href="${info.linkUrl}">${info.linkUrl}</a>`;
    } else if (info.srcUrl) {
      // Share the image
      html = `<img src="${info.srcUrl}" alt="Shared image">`;
    }
    
    if (html) {
      // Store the HTML and open popup
      chrome.storage.local.set({ contextMenuHtml: html });
      
      // Open popup
      chrome.action.openPopup();
    }
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.contextMenuHtml) {
    // Code popup will pick this up
  }
});
