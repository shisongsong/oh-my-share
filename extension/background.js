// Background service worker for Oh My Share Chrome Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Oh My Share extension installed');
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'upload') {
    uploadContent(request.content, request.language, request.authToken)
      .then(result => sendResponse({ success: true, url: result.url }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Upload content to Oh My Share
async function uploadContent(content, language, authToken) {
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
      language: language || 'html',
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  
  return await response.json();
}
