// Browser compatibility layer
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);

  if (request.action === "collectData") {
    try {
      const data = findArticleContent();
      console.log("Collected Article Content:", data);
      sendResponse({ success: true, data: data });
    } catch (error) {
      console.error("Error collecting article data:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

function findArticleContent() {
  const article = document.getElementById("article-body");
  if (!article) {
    throw new Error('No article with id "article-body" found on this page');
  }

  // Get all paragraphs from the article
  const paragraphs = article.getElementsByTagName("p");

  // Extract text from each paragraph
  const textContent = Array.from(paragraphs)
    .map((p) => p.textContent.trim())
    .filter((text) => text.length > 0) // Remove empty paragraphs
    .join("\n\n"); // Join paragraphs with double newlines

  underlineClaims(getClaimSourceList());

  return {
    text: textContent,
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };
}

function getClaimSourceList() {
  // dummy claims for this article:
  // https://www.ft.com/content/865ee17c-4174-475d-8c78-816c6fbe2003
  return {
    "He defeated Clinton in the 2016 presidential election and Harris in 2024":
      ["https://source1.com", "https://source2.com"],
    "US President Donald Trump has revoked security clearances for Kamala Harris":
      ["https://source3.com"],
  };
}

function underlineClaims(claim_source_list) {
  // Create a sidebar element if it doesn't already exist
  let sidebar = document.getElementById("source-sidebar");
  if (!sidebar) {
    sidebar = document.createElement("div");
    sidebar.id = "source-sidebar";
    sidebar.style.position = "fixed";
    sidebar.style.top = "0";
    sidebar.style.right = "-300px";
    sidebar.style.width = "300px";
    sidebar.style.height = "100%";
    sidebar.style.backgroundColor = "#f9f9f9";
    sidebar.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.2)";
    sidebar.style.overflowY = "auto";
    sidebar.style.padding = "10px";
    sidebar.style.transition = "right 0.3s ease";
    sidebar.style.zIndex = "10000";
    document.body.appendChild(sidebar);

    // Add a close button to the sidebar
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.marginBottom = "10px";
    closeButton.onclick = () => {
      sidebar.style.right = "-300px";
    };
    sidebar.appendChild(closeButton);
  }

  // Find the article element by its ID. This is where the claims will be searched and underlined.
  const article = document.getElementById("article-body");
  if (!article) {
    // If the article element is not found, throw an error.
    throw new Error('No article with id "article-body" found on this page');
  }

  // Get all paragraph elements within the article.
  const paragraphs = article.getElementsByTagName("p");

  // Iterate through each paragraph in the article.
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i]; // Current paragraph element.
    let text = paragraph.innerHTML; // Extract the HTML content of the paragraph.

    // Iterate through each claim in the claim_source_list object.
    for (const [claim, sources] of Object.entries(claim_source_list)) {
      // Check if the paragraph text contains the current claim.
      if (text.includes(claim)) {
        // Replace the claim in the paragraph text with a span element linking to the sources.
        const newHTML = text.replace(
          new RegExp(`\\b${claim}\\b`, "g"), // Match the claim as a whole word.
          `<span class="underlined-claim" style="color: red; text-decoration: underline; cursor: pointer;" data-sources='${JSON.stringify(
            sources
          )}'>${claim}</span>`
        );

        // Update the paragraph's HTML content with the modified content.
        text = newHTML;
      }
    }

    // Apply the updated HTML back to the paragraph.
    paragraph.innerHTML = text;
  }

  // Add a click event listener to handle clicks on underlined claims
  document.body.addEventListener("click", (event) => {
    if (event.target.classList.contains("underlined-claim")) {
      const sources = JSON.parse(event.target.getAttribute("data-sources"));

      // Populate the sidebar with the source information
      sidebar.innerHTML = `
        <div style="padding: 10px;">
          <button style="margin-bottom: 10px; padding: 5px 10px; background-color: #f44336; color: white; border: none; cursor: pointer;" onclick="document.getElementById('source-sidebar').style.right = '-300px';">Close</button>
          <h2 style="margin-top: 0; font-size: 18px; color: #333;">Claim: "${
            event.target.textContent
          }"</h2>
          <p style="font-size: 14px; color: #555;">The claim above is flagged as potentially misleading. Here are the sources:</p>
          <ul style="list-style-type: none; padding: 0;">
            ${sources
              .map(
                (source, index) => `
              <li style="margin-bottom: 10px;">
                <a href="${source}" target="_blank" style="color: #1a73e8; text-decoration: none; font-size: 14px;">
                  Source ${index + 1}: ${source}
                </a>
              </li>
            `
              )
              .join("")}
          </ul>
        </div>
      `;

      // Open the sidebar
      sidebar.style.right = "0";
    }
  });
}

// Track all sentences with metadata as objects instead of just strings
let allVisibleSentences = new Map(); // Using Map to store sentence -> metadata
// Track currently visible sentences to determine what's new
let currentlyVisibleSentences = new Set();

// Function to check if an element is visible in the viewport
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Function to extract sentences from paragraph text
function extractSentences(text) {
  // Basic sentence splitting - handles periods, question marks, and exclamation points
  return text.match(/[^.!?]+[.!?]+/g) || [];
}

// Function to get all currently visible sentences
function getVisibleSentences() {
  const articleBody = document.getElementById("article-body");

  // If article body doesn't exist, return empty array
  if (!articleBody) {
    console.warn('Article body with ID "article-body" not found');
    return [];
  }

  // Get all paragraphs within the article
  const paragraphs = articleBody.querySelectorAll("p");
  const visibleSentences = [];

  // Check each paragraph
  paragraphs.forEach((paragraph) => {
    // If paragraph is visible
    if (isElementInViewport(paragraph)) {
      // Extract and add sentences
      const sentences = extractSentences(paragraph.textContent);
      visibleSentences.push(...sentences);
    }
  });

  return visibleSentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence);
}

// Function to create a new sentence object with metadata
function createSentenceObject(sentence) {
  return {
    text: sentence,
    isFactChecked: false,
    isClaim: false, // Added claim identifier
    sources: [],
  };
}

// Function to update the history of visible sentences and log new ones
function updateVisibleSentences() {
  const visibleSentences = getVisibleSentences();
  const newVisibleSentencesSet = new Set(visibleSentences);

  // Check if currently visible sentences have changed
  if (!setsEqual(currentlyVisibleSentences, newVisibleSentencesSet)) {
    // Find new sentences that weren't visible before
    const newSentences = [];
    newVisibleSentencesSet.forEach((sentence) => {
      if (!allVisibleSentences.has(sentence)) {
        newSentences.push(sentence);
        // Add to our history with metadata
        allVisibleSentences.set(sentence, createSentenceObject(sentence));
      }
    });

    // // Only log if there are new sentences
    // if (newSentences.length > 0) {
    //   console.log("New visible sentences:");
    //   newSentences.forEach((sentence, index) => {
    //     console.log(`${index + 1}. ${sentence}`);
    //   });

    //   console.log("All sentences seen so far:", allVisibleSentences.size);
    //   console.log("-------------------");
    // }

    // Update current set of visible sentences
    currentlyVisibleSentences = newVisibleSentencesSet;
  }
}

// Function to mark a sentence as fact checked with optional sources
function markSentenceAsFactChecked(
  sentence,
  isFactChecked = true,
  sources = []
) {
  if (allVisibleSentences.has(sentence)) {
    const sentenceObj = allVisibleSentences.get(sentence);
    sentenceObj.isFactChecked = isFactChecked;
    sentenceObj.sources = sources;
    console.log(
      `Sentence marked as ${
        isFactChecked ? "fact-checked" : "not fact-checked"
      }:`,
      sentence
    );
    return true;
  } else {
    console.warn("Sentence not found in history:", sentence);
    return false;
  }
}

// Function to mark a sentence as a claim
function markSentenceAsClaim(sentence, isClaim = true) {
  if (allVisibleSentences.has(sentence)) {
    const sentenceObj = allVisibleSentences.get(sentence);
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

// Function to add a source to a fact-checked sentence
function addSourceToSentence(sentence, source) {
  if (allVisibleSentences.has(sentence)) {
    const sentenceObj = allVisibleSentences.get(sentence);
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

// Function to get all sentences with their metadata
function getAllSentenceData() {
  return Array.from(allVisibleSentences.entries()).map(([text, data]) => ({
    text,
    isFactChecked: data.isFactChecked,
    isClaim: data.isClaim,
    sources: data.sources,
  }));
}

// Function to get only fact-checked sentences
function getFactCheckedSentences() {
  return Array.from(allVisibleSentences.entries())
    .filter(([_, data]) => data.isFactChecked)
    .map(([text, data]) => ({
      text,
      isClaim: data.isClaim,
      sources: data.sources,
    }));
}

// Function to get only claims
function getClaims() {
  return Array.from(allVisibleSentences.entries())
    .filter(([_, data]) => data.isClaim)
    .map(([text, data]) => ({
      text,
      isFactChecked: data.isFactChecked,
      sources: data.sources,
    }));
}

// Helper function to compare Sets for equality
function setsEqual(setA, setB) {
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

// Set up scroll event listener with debouncing for performance
let scrollTimeout;
window.addEventListener("scroll", async function () {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(updateVisibleSentences, 200);

  // Get non fact-checked sentences
  const nonFactCheckedSentences = Array.from(allVisibleSentences.entries())
    .filter(([_, data]) => !data.isFactChecked)
    .map(([text, data]) => ({
      text,
      isClaim: data.isClaim,
      sources: data.sources,
    }));

  if (nonFactCheckedSentences.length > 0) {
    // console.log("Fact-checking sentences");
    // const { claims } = await factCheckSentences(nonFactCheckedSentences);
    // console.log("Claims:", claims);
    // Update set of sentences
    // claims.forEach((sentence) => {
    //   markSentenceAsFactChecked(sentence.text, true, sentence.sources);
    // });
  }
});

// Run once on initial page load
document.addEventListener("DOMContentLoaded", async () => {
  updateVisibleSentences();
});

// Also run when page is fully loaded (for images and other resources)
window.addEventListener("load", updateVisibleSentences);

// Expose utility functions to the window object for console access
window.sentenceTracker = {
  getAllSentences: getAllSentenceData,
  getFactCheckedSentences: getFactCheckedSentences,
  getClaims: getClaims,
  markAsFactChecked: markSentenceAsFactChecked,
  markAsClaim: markSentenceAsClaim,
  addSource: addSourceToSentence,
};

// Initialize
updateVisibleSentences();

window.onload = async function () {
  const factCheckingApp = {
    apiEndpoint: "http://localhost:5001/fact-check-article",
    requestTimeout: 60000, // Increased to 60 seconds (1 minute)
    statusElement:
      document.getElementById("fact-check-status") || createStatusElement(),

    init: async function () {
      try {
        this.showStatus("Initializing fact-checker...");

        console.log("Hostname:", window.location.hostname);

        // If user is not on Financial Time website, show error message
        if (window.location.hostname !== "www.ft.com") {
          throw new Error("Fact-checker is only available on Financial Time");
        }

        const article = this.findArticleContent();

        if (!article || !article.text) {
          throw new Error("Could not extract article content");
        }

        this.showStatus("Fact-checking article... This may take a minute");
        // Show progress indicator
        this.startProgressIndicator();

        const { claims } = await this.factCheckArticle(article.text);
        this.stopProgressIndicator();

        this.displayResults(claims);

        this.highlightClaims(claims || []);
      } catch (error) {
        this.stopProgressIndicator();
        this.handleError(error);
      }
    },

    findArticleContent: function () {
      try {
        return findArticleContent();
      } catch (error) {
        throw new Error(`Article extraction failed: ${error.message}`);
      }
    },

    factCheckArticle: async function (articleText) {
      let timeoutId;

      // Create a cancellable timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(
          () =>
            reject(
              new Error(
                "Request timed out. The server is taking longer than expected to respond."
              )
            ),
          this.requestTimeout
        );
      });

      try {
        // Display periodic status updates during the fetch
        this.updateStatusPeriodically();

        const fetchPromise = fetch(this.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            article: articleText,
          }),
        });

        // Use Promise.race to implement timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        // Stop periodic updates
        this.stopPeriodicUpdates();

        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`
          );
        }

        return await response.json();
      } catch (error) {
        // Clear timeout if there was an error
        clearTimeout(timeoutId);

        // Stop periodic updates
        this.stopPeriodicUpdates();

        throw error;
      }
    },

    // Keep track of timers to clear them later
    timers: {
      progressInterval: null,
      statusUpdateInterval: null,
    },

    // Start a simple spinner or progress indicator
    startProgressIndicator: function () {
      const frames = ["-", "\\", "|", "/"];
      let i = 0;

      this.timers.progressInterval = setInterval(() => {
        const currentText = this.statusElement.textContent;
        const baseText = currentText.replace(/[-\\|/]$/, "").trim();
        this.statusElement.textContent = `${baseText} ${frames[i]}`;
        i = (i + 1) % frames.length;
      }, 250);
    },

    stopProgressIndicator: function () {
      if (this.timers.progressInterval) {
        clearInterval(this.timers.progressInterval);
        this.timers.progressInterval = null;
      }
    },

    // Update status with waiting messages to show the user the system is still working
    updateStatusPeriodically: function () {
      const waitingMessages = [
        "Fact-checking article... This may take a minute",
        "Still working...",
        "Processing claims...",
        "Analyzing sources...",
        "Verifying information...",
        "Almost there...",
      ];

      let msgIndex = 0;

      this.timers.statusUpdateInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % waitingMessages.length;
        this.showStatus(waitingMessages[msgIndex]);
      }, 8000); // Update every 8 seconds
    },

    stopPeriodicUpdates: function () {
      if (this.timers.statusUpdateInterval) {
        clearInterval(this.timers.statusUpdateInterval);
        this.timers.statusUpdateInterval = null;
      }
    },

    displayResults: function (results) {
      console.log("Fact-check results:", results);
      this.showStatus("Fact-check complete");
    },

    // Updated method to highlight claims with the specified format
    highlightClaims: function (claims) {
      console.log("Highlighting claims:", claims);
      this.showStatus("Highlighting claims...");
      this.startProgressIndicator();

      if (!claims.length) {
        this.stopProgressIndicator();
        this.showStatus("No claims found");
        return;
      }

      // Get the article content container using the specific ID
      const articleContainer = document.getElementById("article-body");

      if (!articleContainer) {
        console.error("Could not find article with ID 'article-body'");
        this.showStatus("Could not find article with ID 'article-body'");
        this.stopProgressIndicator();
        return;
      }

      // Find all paragraph elements within the article
      const paragraphs = articleContainer.querySelectorAll("p");

      if (paragraphs.length === 0) {
        console.warn("No paragraph tags found within the article");
        this.showStatus("No paragraph tags found within the article");
        this.stopProgressIndicator();
        return;
      }

      // For each claim, find and highlight it in the paragraphs
      claims.forEach((claim) => {
        // Extract the sentence from the claim (using the format you provided)
        const sentenceText = claim.sentence;

        if (!sentenceText) return;

        console.log("Claim:", sentenceText);

        const factCheckText = `This claim has ${
          claim.sources.length
        } supporting source${claim.sources.length !== 1 ? "s" : ""}.`;

        // Default to a yellow highlight for claims that have sources (neutral verification)
        const highlightColor = "#ffffcc"; // light yellow
        const borderColor = "#ffcc00";

        // Look for this sentence in all paragraphs
        paragraphs.forEach((paragraph) => {
          const paragraphHTML = paragraph.innerHTML;

          // If the claim is found in this paragraph
          if (paragraphHTML.includes(sentenceText)) {
            console.log("Found claim:", sentenceText);

            // Escape special characters for regex
            const escapedSentenceText = sentenceText.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );

            // Create a data attribute
            // const dataAttributes = `data-sources="${
            //   claim.sources
            // }" data-fact-check="${this.escapeHtml(factCheckText)}"`;
            const dataAttributes = `data-sources='${JSON.stringify(
              claim.sources
            ).replace(/'/g, "&apos;")}' 
            data-fact-check="${this.escapeHtml(factCheckText)}"`;

            // Replace the sentence text with highlighted version
            const newHTML = paragraphHTML.replace(
              new RegExp(escapedSentenceText, "g"),
              `<span class="fact-checked-claim" 
                    style="background-color: ${highlightColor}; border-bottom: 2px dotted ${borderColor};"
                    ${dataAttributes}>
                 ${sentenceText}
               </span>`
            );

            paragraph.innerHTML = newHTML;
          }
        });
      });

      // Add click handler to show fact-check details
      this.addFactCheckClickHandlers();
      // Add tooltip styles
      this.addTooltipStyles();

      this.stopProgressIndicator();
      this.stopPeriodicUpdates();
      this.showStatus("Highlighting complete");
    },

    // Helper method to escape HTML for data attributes
    escapeHtml: function (text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },

    // Add click handlers to show detailed fact-check information
    addFactCheckClickHandlers: function () {
      // Create a modal element for displaying fact-check details if it doesn't exist
      if (!document.getElementById("fact-check-modal")) {
        const modal = document.createElement("div");
        modal.id = "fact-check-modal";
        modal.className = "fact-check-modal";
        modal.innerHTML = `
          <div class="fact-check-modal-content">
            <span class="fact-check-close">&times;</span>
            <h4>Fact Check</h4>
            <div id="fact-check-explanation"></div>
            <div id="source-count" class="source-info"></div>
            <div id="source-list" class="source-info"></div>
          </div>
        `;
        document.body.appendChild(modal);

        // Add close functionality
        const closeBtn = modal.querySelector(".fact-check-close");
        closeBtn.onclick = function () {
          modal.style.display = "none";
        };

        // Close modal when clicking outside of it
        window.onclick = function (event) {
          if (event.target === modal) {
            modal.style.display = "none";
          }
        };
      }

      // Add click event to highlighted claims
      const highlightedClaims = document.querySelectorAll(
        ".fact-checked-claim"
      );
      highlightedClaims.forEach((claim) => {
        claim.onclick = function () {
          const modal = document.getElementById("fact-check-modal");
          const explanation = document.getElementById("fact-check-explanation");
          const sourceInfo = document.getElementById("source-count");
          const sourceList = document.getElementById("source-list"); // Assuming there's a container for sources

          // Get the fact check text
          explanation.textContent = this.getAttribute("data-fact-check");

          // Parse the sources from the element's attribute
          const sources = JSON.parse(this.getAttribute("data-sources") || "[]");

          // Clear previous source list
          sourceList.innerHTML = "";

          // Set the source info
          if (sources.length > 0) {
            sourceInfo.innerHTML = `<strong>${sources.length} ${
              sources.length === 1 ? "source" : "sources"
            }</strong> found to support this claim.`;
            sourceInfo.className = "source-info source-available";

            // Generate the source list
            sources.forEach((source) => {
              const sourceItem = document.createElement("div");
              sourceItem.className = "source-item";
              sourceItem.style.marginBottom = "10px";

              sourceItem.innerHTML = `
                <a href="${source.link}" target="_blank" class="source-title">${source.title}</a>
                <p class="source-snippet">${source.snippet}</p>
                <span class="source-domain">${source.source}</span>
              `;

              sourceList.appendChild(sourceItem);
            });
          } else {
            sourceInfo.textContent = "No sources found for this claim.";
            sourceInfo.className = "source-info source-unavailable";
          }

          // Display the modal
          modal.style.display = "block";
        };
      });
    },

    // Add CSS styles for tooltips and modals
    addTooltipStyles: function () {
      // Check if styles already exist
      if (document.getElementById("fact-check-styles")) return;

      const styleElement = document.createElement("style");
      styleElement.id = "fact-check-styles";
      styleElement.textContent = `
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
        
        /* Modal styles */
        .fact-check-modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          overflow: auto;
          background-color: rgba(0,0,0,0.4);
        }
        
        .fact-check-modal-content {
          background-color: #fefefe;
          margin: 15% auto;
          padding: 20px;
          border: 1px solid #888;
          width: 80%;
          max-width: 600px;
          border-radius: 5px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .fact-check-close {
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
        }
        
        .fact-check-close:hover {
          color: black;
        }
        
        .source-info {
          margin-top: 15px;
          padding: 10px;
          border-radius: 4px;
          background-color: #f8f8f8;
        }
        
        .source-available {
          border-left: 4px solid #4CAF50;
        }
        
        .source-unavailable {
          border-left: 4px solid #f44336;
        }
      `;

      document.head.appendChild(styleElement);
    },

    showStatus: function (message) {
      console.log(message);
      if (this.statusElement) {
        // Preserve any spinner
        const hasSpinner = /[-\\|/]$/.test(this.statusElement.textContent);
        this.statusElement.textContent = hasSpinner
          ? `${message} ${this.statusElement.textContent.slice(-1)}`
          : message;
      }
    },

    handleError: function (error) {
      const errorMessage = `Error: ${error.message}`;
      console.error(errorMessage);
      this.showStatus(errorMessage);

      // Optionally add visual error indicator
      if (this.statusElement) {
        this.statusElement.classList.add("error");
      }
    },
  };

  // Create status element if it doesn't exist
  function createStatusElement() {
    const statusElement = document.createElement("div");
    statusElement.id = "fact-check-status";
    statusElement.style.cssText =
      "position: fixed; bottom: 20px; right: 20px; padding: 10px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; z-index: 1000; min-width: 220px;";
    document.body.appendChild(statusElement);
    return statusElement;
  }

  // Start the application
  factCheckingApp.init();
};
