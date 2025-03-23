// ✅ server.js (Express API with robust JSON extraction from Cohere response + sources)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { split } from "sentence-splitter";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Helper: Extract factual sentences from article
function extractSentences(sentences) {
  return split(sentences)
    .filter((e) => e.type === "Sentence")
    .map((s) => s.raw.trim())
    .filter((s) => s.length > 30);
}

// Helper: Extract JSON from mixed response text
function extractJsonFromText(text) {
  try {
    // Remove markdown-style ```json code fences
    text = text.trim().replace(/^```json|```$/g, "");

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;

    if (start === -1 || end === -1 || start >= end) {
      throw new Error("Valid JSON array not found.");
    }

    const jsonChunk = text.slice(start, end);
    return JSON.parse(jsonChunk);
  } catch (err) {
    console.error("❌ Failed to extract JSON:", err.message);
    return [];
  }
}

// Helper: Fetch sources using SerpAPI
// async function fetchSources(claim) {
//   try {
//     const response = await axios.get("https://serpapi.com/search.json", {
//       params: {
//         q: `Fact check: ${claim}`,
//         api_key: process.env.SERP_API_KEY,
//         num: 5,
//       },
//     });

//     const results = response.data.organic_results || [];

//     return results
//       .filter((r) => r.title && r.link)
//       .slice(0, 5)
//       .map((r) => ({
//         title: r.title,
//         snippet: r.snippet,
//         link: r.link,
//       }));
//   } catch (err) {
//     console.error("Source fetch error:", err);
//     return [];
//   }
// }

/**
 * Fetches and validates fact-checking sources for a claim
 * @param {string} claim - The claim to find sources for
 * @param {Object} options - Optional configuration parameters
 * @returns {Promise<Array>} - Array of source objects with metadata
 */
async function fetchSources(claim, options = {}) {
  // Default configuration
  const config = {
    maxSources: options.maxSources || 5,
    includeFactCheckSites: options.includeFactCheckSites !== false,
    includeTrustedDomains: options.includeTrustedDomains !== false,
    retryCount: options.retryCount || 1,
    timeout: options.timeout || 8000,
    verbose: options.verbose || false,
  };

  // List of trusted fact-checking domains for filtering
  const trustedFactCheckDomains = [
    "factcheck.org",
    "politifact.com",
    "snopes.com",
    "reuters.com/fact-check",
    "apnews.com/hub/fact-checking",
    "bbc.com/news/reality_check",
    "fullfact.org",
    "factcheck.afp.com",
    "usatoday.com/fact-check",
    "washingtonpost.com/fact-checker",
  ];

  // Create a cleaned version of the claim for searching
  const cleanedClaim = claim.replace(/[^\w\s]/gi, " ").trim();

  try {
    console.log(`🔎 Searching for sources on: "${cleanedClaim}"`);

    // Prepare search queries - one generic and one fact-check specific
    const searchQueries = [{ q: cleanedClaim, label: "General" }];

    if (config.includeFactCheckSites) {
      searchQueries.push({
        q: `Fact check: ${cleanedClaim}`,
        label: "Fact Check",
      });
    }

    // Array to hold all search results
    let allResults = [];

    // Process each search query
    for (const queryObj of searchQueries) {
      try {
        const response = await axios.get("https://serpapi.com/search.json", {
          params: {
            q: queryObj.q,
            api_key: process.env.SERP_API_KEY,
            num: config.maxSources * 2, // Get more results to allow for filtering
            hl: "en",
            gl: "us", // Set to US results for consistency
          },
          timeout: config.timeout,
        });

        // Extract results and add query metadata
        const results = (response.data.organic_results || []).map((r) => ({
          ...r,
          queryType: queryObj.label,
        }));

        allResults = [...allResults, ...results];

        if (config.verbose) {
          console.log(
            `📊 Found ${results.length} results for "${queryObj.label}" query`
          );
        }
      } catch (innerErr) {
        console.error(
          `Error with "${queryObj.label}" search:`,
          innerErr.message
        );
      }
    }

    // Process and filter results
    const processedResults = allResults
      // Ensure essential fields exist
      .filter((r) => r.title && r.link)
      // Score and prioritize results
      .map((r) => {
        // Calculate relevance score
        let score = 0;

        // Prioritize fact-checking sites
        if (
          config.includeTrustedDomains &&
          trustedFactCheckDomains.some((domain) => r.link.includes(domain))
        ) {
          score += 10;
        }

        // Prioritize fact check queries
        if (r.queryType === "Fact Check") {
          score += 5;
        }

        // Prioritize results with claim keywords in title or snippet
        const keywords = cleanedClaim
          .toLowerCase()
          .split(" ")
          .filter((word) => word.length > 3);

        keywords.forEach((keyword) => {
          if (r.title.toLowerCase().includes(keyword)) score += 1;
          if (r.snippet && r.snippet.toLowerCase().includes(keyword))
            score += 0.5;
        });

        // Check for fact-check indicators in title or snippet
        const factCheckTerms = [
          "fact check",
          "fact-check",
          "debunk",
          "verify",
          "false",
          "true",
        ];
        factCheckTerms.forEach((term) => {
          if (r.title.toLowerCase().includes(term)) score += 2;
          if (r.snippet && r.snippet.toLowerCase().includes(term)) score += 1;
        });

        return {
          ...r,
          relevanceScore: score,
        };
      })
      // Sort by relevance score
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      // Take top results
      .slice(0, config.maxSources)
      // Format the output
      .map((r, index) => ({
        title: r.title,
        snippet: r.snippet || "",
        link: r.link,
        source: new URL(r.link).hostname.replace("www.", ""),
        relevanceScore: r.relevanceScore,
        rank: index + 1,
      }));

    console.log(
      `✅ Successfully found ${processedResults.length} relevant sources`
    );
    return processedResults;
  } catch (err) {
    console.error("❌ Source fetch error:", err.message);

    // Attempt retry if configured
    if (options.currentRetry && options.currentRetry < config.retryCount) {
      console.log(
        `🔄 Retrying source fetch (${options.currentRetry + 1}/${
          config.retryCount
        })...`
      );
      return fetchSources(claim, {
        ...options,
        currentRetry: (options.currentRetry || 0) + 1,
      });
    }

    return [];
  }
}

// Helper: Fact-check sentences in batch using JSON format
// async function checkSentences(sentences) {
//   const numbered = sentences.map((s, i) => `${i + 1}. ${s}`).join("\n");

//   const prompt = `
// You are a fact-checking assistant. Analyze each of the following numbered statements and return a JSON array.
// For each, include:
// - sentence (string)
// - verdict (either \"True\" or \"False\")
// - explanation (short explanation of your verdict)

// Statements:
// ${numbered}

// Respond only with the JSON array.`;

//   console.log("🧠 Prompt to Cohere:\n", prompt);

//   const response = await cohere.generate({
//     model: "command",
//     prompt,
//     max_tokens: 800,
//     temperature: 0.5,
//   });

//   const jsonText = response.generations[0].text.trim();

//   console.log("📩 Raw Cohere JSON response:\n", jsonText);

//   const parsed = extractJsonFromText(jsonText);

//   const falseClaims = [];

//   for (const result of parsed) {
//     if (result.verdict.toLowerCase() === "false") {
//       console.log(`🔗 Fetching sources for: \"${result.sentence}\"`);
//       result.sources = await fetchSources(result.sentence);
//       falseClaims.push(result);
//     }
//   }

//   console.log(`\n❌ Found ${falseClaims.length} inaccurate claim(s).\n`);
//   console.log(falseClaims);
//   return falseClaims;
// }

async function checkSentences(sentences) {
  // Skip processing if there are no sentences
  if (!sentences || sentences.length === 0) {
    console.log("No sentences to check");
    return [];
  }

  // Create a numbered list with clear formatting
  // const numbered = sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join("\n");

  const systemPrompt = `
  You are a specialized fact-checking assistant designed to identify inaccuracies in articles.
  
  Instructions:
  1. Analyze the provided article to identify factual claims.
  2. Evaluate each claim for accuracy using your knowledge.
  3. Extract ONLY statements that contain inaccurate or unfactual information.
  4. For each inaccurate claim, include the exact verbatim text as it appears in the article.
  5. If no inaccurate claims are found, return an empty array.
  
  Response Format:
  Return ONLY a properly formatted JSON array with the following structure:
  [
    {
      "sentence": "The exact text of the inaccurate statement",
    },
    // Additional inaccurate statements if present
  ]
  
  Do not include any explanatory text, commentary, or any content other than the JSON array.
  `;

  // Create a more detailed prompt with specific instructions and examples
  const userPrompt = `
  Please analyze the following article for factual accuracy:
  
  ARTICLE TEXT:
  ${sentences}
  
  Identify and extract ONLY statements containing inaccurate or misleading information. Return your findings as a JSON array of inaccurate statements exactly as they appear in the text. If all statements are factually accurate, return an empty array.
  `;

  const response = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.COHERE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      stream: false,
      model: "command-r-plus-08-2024",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  const data = await response.json();

  console.log("📩 Raw Cohere JSON response:\n", data);

  const extractedText = data.message.content[0].text; // Get the JSON string

  console.log("📩 Extracted JSON:\n", extractedText);
  // Ensure we have valid JSON by cleaning up the response if needed
  try {
    // Try to extract JSON if it's not cleanly formatted
    const parsed = extractJsonFromText(extractedText);

    console.log("✅ Extracted", parsed.length, "sentences.");

    // Process the results with more detail
    const results = [];

    // Process each result
    for (const result of parsed) {
      console.log(
        `🔗 Fetching sources for inaccurate claim: "${result.sentence}"`
      );
      result.sources = await fetchSources(result.sentence);
      results.push(result);
    }

    // Return full results object or just false claims depending on needs
    return results;
  } catch (error) {
    console.error("Error processing AI response:", error);
    return { error: "Failed to parse AI response", originalResponse: data };
  }
}

// API route to process full article
app.post("/fact-check-article", async (req, res) => {
  const { article } = req.body;

  if (!article || article.length < 50) {
    return res.status(400).json({ error: "Invalid article input." });
  }

  try {
    const claims = await checkSentences(article);

    console.log(`❌ Found ${claims.length} inaccurate claim(s).`);
    console.log(claims);

    res.json({ claims });
  } catch (error) {
    console.error("Fact-check article error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
