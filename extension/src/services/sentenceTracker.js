// Create a global namespace for sentence tracking
window.SentenceTracker = class {
  constructor() {
    this.allVisibleSentences = new Map(); // Using Map to store sentence -> metadata
    this.currentlyVisibleSentences = new Set();
  }

  getVisibleSentences() {
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

    let articleElement = null;
    
    // Try each selector until we find the article content
    for (const selector of articleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        articleElement = element;
        break;
      }
    }

    // If no specific article element is found, use the body
    if (!articleElement) {
      articleElement = document.body;
    }

    // Get all paragraphs within the article
    const paragraphs = Array.from(articleElement.querySelectorAll('p'));
    const visibleSentences = [];

    // Check each paragraph
    paragraphs.forEach((paragraph) => {
      // If paragraph is visible
      if (window.DOMUtils.isElementInViewport(paragraph)) {
        // Extract and add sentences
        const sentences = window.DOMUtils.extractSentences(paragraph.textContent);
        visibleSentences.push(...sentences);
      }
    });

    return visibleSentences
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence);
  }

  createSentenceObject(sentence) {
    return {
      text: sentence,
      isFactChecked: false,
      isClaim: false,
      sources: [],
    };
  }

  updateVisibleSentences() {
    const visibleSentences = this.getVisibleSentences();
    const newVisibleSentencesSet = new Set(visibleSentences);

    // Check if currently visible sentences have changed
    if (!window.DOMUtils.setsEqual(this.currentlyVisibleSentences, newVisibleSentencesSet)) {
      // Find new sentences that weren't visible before
      newVisibleSentencesSet.forEach((sentence) => {
        if (!this.allVisibleSentences.has(sentence)) {
          // Add to our history with metadata
          this.allVisibleSentences.set(sentence, this.createSentenceObject(sentence));
        }
      });

      // Update current set of visible sentences
      this.currentlyVisibleSentences = newVisibleSentencesSet;
    }
  }

  markSentenceAsFactChecked(sentence, isFactChecked = true, sources = []) {
    if (this.allVisibleSentences.has(sentence)) {
      const sentenceObj = this.allVisibleSentences.get(sentence);
      sentenceObj.isFactChecked = isFactChecked;
      sentenceObj.sources = sources;
      console.log(
        `Sentence marked as ${isFactChecked ? "fact-checked" : "not fact-checked"}:`,
        sentence
      );
      return true;
    } else {
      console.warn("Sentence not found in history:", sentence);
      return false;
    }
  }

  markSentenceAsClaim(sentence, isClaim = true) {
    if (this.allVisibleSentences.has(sentence)) {
      const sentenceObj = this.allVisibleSentences.get(sentence);
      sentenceObj.isClaim = isClaim;
      console.log(
        `Sentence marked as ${isClaim ? "a claim" : "not a claim"}:`,
        sentence
      );
      return true;
    } else {
      console.warn("Sentence not found in history:", sentence);
      return false;
    }
  }

  addSourceToSentence(sentence, source) {
    if (this.allVisibleSentences.has(sentence)) {
      const sentenceObj = this.allVisibleSentences.get(sentence);
      if (!sentenceObj.sources.includes(source)) {
        sentenceObj.sources.push(source);
        console.log(`Source added to sentence:`, source);
      }
      return true;
    } else {
      console.warn("Sentence not found in history:", sentence);
      return false;
    }
  }

  getAllSentences() {
    return Array.from(this.allVisibleSentences.entries()).map(([text, data]) => ({
      text,
      isFactChecked: data.isFactChecked,
      isClaim: data.isClaim,
      sources: data.sources,
    }));
  }

  getFactCheckedSentences() {
    return Array.from(this.allVisibleSentences.entries())
      .filter(([_, data]) => data.isFactChecked)
      .map(([text, data]) => ({
        text,
        isClaim: data.isClaim,
        sources: data.sources,
      }));
  }

  getClaims() {
    return Array.from(this.allVisibleSentences.entries())
      .filter(([_, data]) => data.isClaim)
      .map(([text, data]) => ({
        text,
        isFactChecked: data.isFactChecked,
        sources: data.sources,
      }));
  }
}; 