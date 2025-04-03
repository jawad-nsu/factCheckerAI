// Create a global namespace for DOM utilities
window.DOMUtils = {
  // Function to check if an element is visible in the viewport
  isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // Function to extract sentences from paragraph text
  extractSentences(text) {
    // Basic sentence splitting - handles periods, question marks, and exclamation points
    return text.match(/[^.!?]+[.!?]+/g) || [];
  },

  // Helper function to compare Sets for equality
  setsEqual(setA, setB) {
    if (setA.size !== setB.size) return false;
    for (const item of setA) {
      if (!setB.has(item)) return false;
    }
    return true;
  },

  // Helper method to escape HTML for data attributes
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  // Function to create a status element
  createStatusElement() {
    const statusElement = document.createElement("div");
    statusElement.id = "fact-check-status";
    statusElement.style.cssText =
      "position: fixed; bottom: 20px; right: 20px; padding: 10px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; z-index: 1000; min-width: 220px;";
    document.body.appendChild(statusElement);
    return statusElement;
  }
}; 