// Content script for Oh My Share Chrome Extension

let selectedElement = null;
let selectionHighlight = null;
let isSelecting = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedElement') {
    if (selectedElement) {
      sendResponse({ html: selectedElement.outerHTML });
    } else {
      sendResponse({ html: null });
    }
  } else if (request.action === 'startSelection') {
    isSelecting = true;
    document.body.style.cursor = 'crosshair';
    sendResponse({ success: true });
  } else if (request.action === 'stopSelection') {
    isSelecting = false;
    document.body.style.cursor = '';
    sendResponse({ success: true });
  }
  return true;
});

// Add click handler to select elements
document.addEventListener('click', (e) => {
  if (!isSelecting) return;
  
  // Prevent default behavior
  e.preventDefault();
  e.stopPropagation();
  
  // Remove previous highlight
  if (selectionHighlight) {
    selectionHighlight.classList.remove('oh-my-share-highlight');
  }
  
  // Select the clicked element
  selectedElement = e.target;
  
  // Highlight the selected element
  selectionHighlight = selectedElement;
  selectionHighlight.classList.add('oh-my-share-highlight');
  
  // Stop selecting
  isSelecting = false;
  document.body.style.cursor = '';
  
  // Notify popup
  chrome.runtime.sendMessage({ 
    action: 'elementSelected', 
    html: selectedElement.outerHTML 
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
