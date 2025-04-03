// Create a global namespace for fact checking
window.FactCheckService = class {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
    this.isChecking = false;
    this.requestTimeout = 60000; // 30 seconds timeout
    this.progressTimer = null;
    this.statusUpdateTimer = null;
  }

  async factCheckArticle(articleText) {
    console.log('Starting factCheckArticle with endpoint:', this.apiEndpoint);
    this.isChecking = true;

    try {
      // Create a cancellable timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out after ' + this.requestTimeout + 'ms'));
        }, this.requestTimeout);
      });

      // Create the fetch request
      const fetchPromise = fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleText),
      });

      console.log('Sending request to API...');
      // Race between the fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      console.log('Received response from API');

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data from API:', data);

      // Process the response
      if (data.inaccuracies && data.inaccuracies.length > 0) {
        console.log('Processing inaccuracies:', data.inaccuracies.length);
        this.highlightClaims(data.inaccuracies);
        this.addFactCheckClickHandlers();
      } else {
        console.log('No inaccuracies found in the response');
      }

      this.isChecking = false;
      return data;
    } catch (error) {
      console.error('Error in factCheckArticle:', error);
      this.isChecking = false;
      throw error;
    }
  }

  highlightClaims(claims) {
    console.log('Starting to highlight claims');
    const articleContainer = document.querySelector('article, main, [role="main"]') || document.body;
    
    claims.forEach(claim => {
      console.log('Processing claim:', claim.sentence);
      const escapedText = window.DOMUtils.escapeHtml(claim.sentence);
      const regex = new RegExp(escapedText, 'gi');
      
      articleContainer.innerHTML = articleContainer.innerHTML.replace(
        regex,
        match => {
          // Properly escape the sources JSON
          const sources = claim.sources ? JSON.stringify(claim.sources).replace(/"/g, '&quot;') : '[]';
          return `<span class="fact-checked-claim" 
                    data-sources="${sources}"
                    style="background-color: rgba(255, 235, 59, 0.3);">
                  ${match}
                  </span>`;
        }
      );
    });
    console.log('Finished highlighting claims');
  }

  addFactCheckClickHandlers() {
    console.log('Adding click handlers for fact-checked claims');
    document.querySelectorAll('.fact-checked-claim').forEach(claim => {
      claim.addEventListener('click', (event) => {
        console.log('Claim clicked, showing details');
        this.showFactCheckDetails(event.target);
      });
    });
  }

  showFactCheckDetails(claimElement) {
    console.log('Showing fact-check details');
    try {
      // Get the sources data and properly decode it
      const sourcesData = claimElement.getAttribute('data-sources');
      if (!sourcesData) {
        console.warn('No sources data found for claim');
        return;
      }

      // Replace &quot; with " before parsing
      const decodedSources = sourcesData.replace(/&quot;/g, '"');
      const sources = JSON.parse(decodedSources);
      
      // Remove any existing modal and overlay
      const existingModal = document.querySelector('.fact-check-modal');
      const existingOverlay = document.querySelector('.fact-check-overlay');
      if (existingModal) existingModal.remove();
      if (existingOverlay) existingOverlay.remove();

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'fact-check-modal';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        width: 80%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        display: block;
      `;

      // Add sources
      const sourcesHtml = sources.length > 0
        ? sources.map(source => `
            <div class="source" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
              <a href="${source.link}" target="_blank" style="color: #1a73e8; text-decoration: none; font-weight: 500; display: block; margin-bottom: 5px;">
                ${source.title}
              </a>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">${source.snippet}</p>
              <span style="color: #888; font-size: 12px;">${source.source}</span>
            </div>
          `).join('')
        : '<p style="color: #666; text-align: center;">No sources available</p>';

      modal.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Fact Check Sources</h3>
          <div class="sources" style="margin-top: 10px;">
            ${sourcesHtml}
          </div>
        </div>
        <button onclick="document.querySelector('.fact-check-modal').remove(); document.querySelector('.fact-check-overlay').remove();" style="
          margin-top: 10px;
          padding: 8px 16px;
          background: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: block;
          margin-left: auto;
          margin-right: auto;
        ">Close</button>
      `;

      // Add modal to document
      document.body.appendChild(modal);

      // Add overlay
      const overlay = document.createElement('div');
      overlay.className = 'fact-check-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 999;
        display: block;
      `;
      document.body.appendChild(overlay);

      // Remove modal and overlay when clicking outside
      overlay.addEventListener('click', () => {
        modal.remove();
        overlay.remove();
      });
    } catch (error) {
      console.error('Error showing fact check details:', error);
      // Show a simple error message to the user
      alert('Error displaying fact check details. Please try again.');
    }
  }

  addTooltipStyles() {
    console.log('Adding tooltip styles');
    const style = document.createElement('style');
    style.textContent = `
      .fact-checked-claim {
        position: relative;
        cursor: pointer;
        padding: 0 2px;
        border-radius: 3px;
        transition: background-color 0.2s;
      }
      .fact-checked-claim:hover {
        filter: brightness(0.95);
      }
    `;
    document.head.appendChild(style);
  }
}; 