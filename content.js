// Function to find and extract article content
function findArticleContent() {
  const article = document.getElementById('article-body');
  if (!article) {
    throw new Error('No article with id "article-body" found on this page');
  }

  // Get all paragraphs from the article
  const paragraphs = article.getElementsByTagName('p');
  
  // Extract text from each paragraph
  const textContent = Array.from(paragraphs)
    .map(p => p.textContent.trim())
    .filter(text => text.length > 0) // Remove empty paragraphs
    .join('\n\n'); // Join paragraphs with double newlines

  return {
    text: textContent,
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'collectData') {
    try {
      const data = findArticleContent();
      console.log('Collected Article Content:', data);
      sendResponse({ success: true, data: data });
    } catch (error) {
      console.error('Error collecting article data:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
}); 