// ✅ server.js (Express API with robust JSON extraction from Cohere response + sources)

import express from "express";
import cors from "cors";
import { CohereClient } from "cohere-ai";
import dotenv from "dotenv";
import { split } from "sentence-splitter";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

app.use(cors());
app.use(express.json());

// Helper: Extract factual sentences from article
function extractSentences(articleText) {
  return split(articleText)
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
async function fetchSources(claim) {
  try {
    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        q: `Fact check: ${claim}`,
        api_key: process.env.SERP_API_KEY,
        num: 5,
      },
    });

    const results = response.data.organic_results || [];

    return results
      .filter((r) => r.title && r.link)
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link,
      }));
  } catch (err) {
    console.error("Source fetch error:", err);
    return [];
  }
}

// Helper: Fact-check sentences in batch using JSON format
async function checkSentences(sentences) {
  const numbered = sentences.map((s, i) => `${i + 1}. ${s}`).join("\n");

  const prompt = `
You are a fact-checking assistant. Analyze each of the following numbered statements and return a JSON array. 
For each, include:
- sentence (string)
- verdict (either \"True\" or \"False\")
- explanation (short explanation of your verdict)

Statements:
${numbered}

Respond only with the JSON array.`;

  console.log("🧠 Prompt to Cohere:\n", prompt);

  const response = await cohere.generate({
    model: "command",
    prompt,
    max_tokens: 800,
    temperature: 0.5,
  });

  const jsonText = response.generations[0].text.trim();

  console.log("📩 Raw Cohere JSON response:\n", jsonText);

  const parsed = extractJsonFromText(jsonText);

  const falseClaims = [];

  for (const result of parsed) {
    if (result.verdict.toLowerCase() === "false") {
      console.log(`🔗 Fetching sources for: \"${result.sentence}\"`);
      result.sources = await fetchSources(result.sentence);
      falseClaims.push(result);
    }
  }

  console.log(`\n❌ Found ${falseClaims.length} inaccurate claim(s).\n`);
  console.log(falseClaims);
  return falseClaims;
}

// API route to process full article
app.post("/fact-check-article", async (req, res) => {
  const { article } = req.body;
  if (!article || article.length < 50) {
    return res.status(400).json({ error: "Invalid article input." });
  }

  try {
    const sentences = extractSentences(article);
    const falseClaims = await checkSentences(sentences);

    res.json({
      falseClaims,
    });
  } catch (error) {
    console.error("Fact-check article error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
