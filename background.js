// Browser compatibility layer
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Listen for installation
browserAPI.runtime.onInstalled.addListener(() => {
  console.log('Website Data Collector extension installed');
});

// Listen for any messages from content script or popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'log') {
    console.log('Background script received log:', request.data);
  }
  return true;
}); 