// Get DOM elements
const statusElement = document.getElementById('status');
const checkButton = document.getElementById('check-button');
const claimsCountElement = document.getElementById('claims-count');
const sourcesCountElement = document.getElementById('sources-count');

// Update UI with fact-check status
function updateStatus(message, isError = false, isSuccess = false) {
  statusElement.textContent = message;
  statusElement.className = 'status';
  if (isError) statusElement.classList.add('error');
  if (isSuccess) statusElement.classList.add('success');
}

// Update statistics
function updateStats(claims, sources) {
  claimsCountElement.textContent = claims;
  sourcesCountElement.textContent = sources;
}

// Check if the current page is likely to contain article content
function isLikelyArticlePage() {
  // Check for common article indicators
  const hasArticleTag = document.querySelector('article') !== null;
  const hasMainContent = document.querySelector('main, [role="main"]') !== null;
  const hasParagraphs = document.querySelectorAll('p').length > 3;
  const hasHeadline = document.querySelector('h1, .headline, .article-title') !== null;
  
  return hasArticleTag || (hasMainContent && hasParagraphs && hasHeadline);
}

// Initialize popup
async function initializePopup() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      updateStatus('No active tab found', true);
      checkButton.disabled = true;
      return;
    }

    // Check if the page is likely to contain article content
    const isArticlePage = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: isLikelyArticlePage
    });

    if (!isArticlePage[0]?.result) {
      updateStatus('This page does not appear to contain article content', true);
      checkButton.disabled = true;
      return;
    }

    // Get current fact-check status
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getFactCheckStatus' });
      
      if (response?.error) {
        updateStatus(response.error, true);
        return;
      }

      // Update UI with current status
      if (response?.isChecking) {
        updateStatus('Fact-checking in progress...');
        checkButton.disabled = true;
      } else {
        updateStatus('Ready to fact-check');
        checkButton.disabled = false;
      }

      // Update statistics
      updateStats(response?.claimsCount || 0, response?.sourcesCount || 0);
    } catch (error) {
      console.error('Error getting fact-check status:', error);
      updateStatus('Ready to fact-check');
      checkButton.disabled = false;
    }

  } catch (error) {
    console.error('Error initializing popup:', error);
    updateStatus('Ready to fact-check');
    checkButton.disabled = false;
  }
}

// Handle check button click
checkButton.addEventListener('click', async () => {
  try {
    updateStatus('Starting fact-check...');
    checkButton.disabled = true;

    const response = await chrome.runtime.sendMessage({ action: 'startFactCheck' });
    
    if (response?.error) {
      updateStatus(response.error, true);
      checkButton.disabled = false;
      return;
    }

    updateStatus('Fact-checking in progress...');
    
    // Update statistics
    updateStats(response?.claimsCount || 0, response?.sourcesCount || 0);

  } catch (error) {
    console.error('Error starting fact-check:', error);
    updateStatus('Error starting fact-check', true);
    checkButton.disabled = false;
  }
});

// Initialize popup when opened
document.addEventListener('DOMContentLoaded', initializePopup); 