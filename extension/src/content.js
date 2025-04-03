// Initialize services
const sentenceTracker = new window.SentenceTracker();
const factCheckService = new window.FactCheckService('http://localhost:5001/api/fact-check');

// Message listener for communication with popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === 'getFactCheckStatus') {
    console.log('Sending fact-check status:', {
      isChecking: factCheckService.isChecking,
      claimsCount: sentenceTracker.getClaims().length,
      sourcesCount: sentenceTracker.getAllSentences().reduce((count, sentence) => 
        count + (sentence.sources?.length || 0), 0
      )
    });
    sendResponse({
      isChecking: factCheckService.isChecking,
      claimsCount: sentenceTracker.getClaims().length,
      sourcesCount: sentenceTracker.getAllSentences().reduce((count, sentence) => 
        count + (sentence.sources?.length || 0), 0
      )
    });
  }

  if (request.action === 'startFactCheck') {
    console.log('Starting fact-check process...');
    const articleContent = extractArticleContent();
    if (articleContent) {
      console.log('Article content extracted:', articleContent);
      factCheckService.factCheckArticle(articleContent)
        .then(() => {
          console.log('Fact-check completed successfully');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Error during fact-check:', error);
          sendResponse({ error: error.message });
        });
    } else {
      console.error('Could not extract article content');
      sendResponse({ error: 'Could not extract article content' });
    }
    return true; // Required for async response
  }
});

// Function to extract article content
function extractArticleContent() {
  try {
    console.log('Attempting to extract article content...');
    // Common article content selectors
    const articleSelectors = [
      'article', // Generic article tag
      '[role="article"]', // ARIA role
      '.article', // Common class
      '.post-content', // Common class
      '.entry-content', // Common class
      '.story-body', // Common class
      'main', // Main content
      '#content', // Common ID
      '.content', // Common class
      '.article-body', // Common class
      '.article-content', // Common class
      '.post-body', // Common class
      '.entry-body', // Common class
      '.story-content', // Common class
    ];

    // Try each selector until we find the article content
    for (const selector of articleSelectors) {
      console.log('Trying selector:', selector);
      const articleElement = document.querySelector(selector);
      if (articleElement) {
        console.log('Found article element with selector:', selector);
        // Get the article title
        const title = document.querySelector('h1, .article-title, .post-title, .entry-title')?.textContent || '';
        
        // Get all paragraphs within the article
        const paragraphs = Array.from(articleElement.querySelectorAll('p'))
          .map(p => p.textContent.trim())
          .filter(text => text.length > 0);

        if (paragraphs.length > 0) {
          console.log('Successfully extracted article content with', paragraphs.length, 'paragraphs');
          return {
            title: title,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            content: paragraphs.join('\n\n')
          };
        }
      }
    }

    // If no specific article element is found, try to get all paragraphs
    console.log('No specific article element found, trying to extract all paragraphs');
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .filter(text => text.length > 0);

    if (paragraphs.length > 0) {
      console.log('Successfully extracted content with', paragraphs.length, 'paragraphs');
      return {
        title: document.querySelector('h1')?.textContent || '',
        url: window.location.href,
        timestamp: new Date().toISOString(),
        content: paragraphs.join('\n\n')
      };
    }

    console.log('No article content found');
    return null;
  } catch (error) {
    console.error('Error extracting article content:', error);
    return null;
  }
}

// Set up event listeners
window.addEventListener('scroll', () => {
  sentenceTracker.updateVisibleSentences();
});

window.addEventListener('load', () => {
  sentenceTracker.updateVisibleSentences();
});

// Initialize fact-checking
console.log('Initializing fact-checking...');
const articleContent = extractArticleContent();
if (articleContent) {
  console.log('Starting initial fact-check...');
  factCheckService.factCheckArticle(articleContent)
    .then(() => {
      console.log('Initial fact-check completed');
    })
    .catch(error => {
      console.error('Error during initial fact-check:', error);
    });
} 