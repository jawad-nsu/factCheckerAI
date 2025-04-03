// Browser compatibility layer
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', function() {
  const collectButton = document.getElementById('collectData');
  const buttonText = document.getElementById('buttonText');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const statusDiv = document.getElementById('status');

  collectButton.addEventListener('click', async () => {
    try {
      // Show loading state
      buttonText.textContent = 'Evaluating...';
      loadingSpinner.classList.remove('hidden');
      collectButton.disabled = true;
      
      // Get the active tab
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're in Firefox or Chrome
      if (typeof browser !== 'undefined') {
        // Firefox approach - content script is already injected via manifest
        // Just send the message to collect data
        const response = await browserAPI.tabs.sendMessage(tab.id, { action: 'collectData' });
        
        if (response && response.success) {
          showStatus('Article evaluated successfully!', 'success');
        } else {
          showStatus('Failed to evaluate article: ' + (response?.error || 'Unknown error'), 'error');
        }
      } else {
        // Chrome approach - inject content script first
        await browserAPI.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });

        // Send message to content script to collect data
        const response = await browserAPI.tabs.sendMessage(tab.id, { action: 'collectData' });
        
        if (response && response.success) {
          showStatus('Article evaluated successfully!', 'success');
        } else {
          showStatus('Failed to evaluate article: ' + (response?.error || 'Unknown error'), 'error');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      showStatus('Error: ' + error.message, 'error');
    } finally {
      // Reset button state
      buttonText.textContent = 'Evaluate Article';
      loadingSpinner.classList.add('hidden');
      collectButton.disabled = false;
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