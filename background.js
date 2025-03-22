// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Website Data Collector extension installed');
});

// Listen for any messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'log') {
    console.log('Background script received log:', request.data);
  }
  return true;
}); 