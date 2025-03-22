document.addEventListener('DOMContentLoaded', function() {
  const collectButton = document.getElementById('collectData');
  const statusDiv = document.getElementById('status');

  collectButton.addEventListener('click', async () => {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // First inject the content script if it's not already injected
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Send message to content script to collect data
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'collectData' });
      
      if (response && response.success) {
        showStatus('Data collected successfully!', 'success');
      } else {
        showStatus('Failed to collect data: ' + (response?.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showStatus('Error: ' + error.message, 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}); 