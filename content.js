// Function to collect website data
function collectWebsiteData() {
  const data = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    content: {
      text: document.body.innerText,
      html: document.documentElement.outerHTML,
      meta: {
        description: document.querySelector('meta[name="description"]')?.content || '',
        keywords: document.querySelector('meta[name="keywords"]')?.content || '',
        author: document.querySelector('meta[name="author"]')?.content || ''
      },
      links: Array.from(document.links).map(link => ({
        href: link.href,
        text: link.textContent
      })),
      images: Array.from(document.images).map(img => ({
        src: img.src,
        alt: img.alt
      }))
    }
  };

  return data;
}

// Function to send data to backend API
async function sendDataToBackend(data) {
  try {
    const response = await fetch('YOUR_BACKEND_API_ENDPOINT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending data to backend:', error);
    throw error;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'collectData') {
    try {
      const data = collectWebsiteData();
      sendDataToBackend(data)
        .then(() => {
          console.log('Data sent successfully');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Error sending data:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Will respond asynchronously
    } catch (error) {
      console.error('Error collecting data:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep the message channel open for async response
}); 