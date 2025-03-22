// Function to find and extract article content
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

/**
 * Function to underline claims in an article and link them to their sources.
 * Clicking on the underlined claim opens a sidebar displaying the sources.
 * @param {Object} claim_source_list - An object where keys are claims (strings) and values are arrays of URLs (strings) linking to their sources.
 */
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

console.log("Content script loaded");

const content = findArticleContent();

console.log(content);

if (content) {
  try {
    const response = fetch("http://localhost:5001/fact-check-article", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        article: content.text,
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const { falseClaims } = await response.json();

    console.log(falseClaims);

    underlineClaims(falseClaims);
  } catch (error) {
    console.error("Fact-check article error:", error);
  }
}
