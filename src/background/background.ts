console.log('IndexedDB Explorer background script loaded');

// Basic message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  // Forward messages between content script and devtools
  if (request.target === 'background') {
    sendResponse({ status: 'ok', message: 'Background script is running' });
  }
  
  return true; // Keep message channel open
});

// Extension installed/updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('IndexedDB Explorer installed');
});