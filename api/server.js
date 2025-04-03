// ✅ server.js (Express API with robust JSON extraction from Cohere response + sources)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { split } from "sentence-splitter";
import axios from "axios";
import { checkSentences } from "./src/services/factCheckService.js";
import { fetchSources } from "./src/services/sourceService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

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

    const jsonStr = text.slice(start, end);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error extracting JSON:", error);
    throw new Error("Failed to extract valid JSON from response.");
  }
}

// Fact-check endpoint
app.post("/api/fact-check", async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.length < 50) {
      return res.status(400).json({ error: "Invalid article content" });
    }

    // Extract sentences from the article
    const sentences = extractSentences(content);
    console.log(`Extracted ${sentences.length} sentences from article`);

    // Check sentences for inaccuracies
    const inaccuracies = await checkSentences(sentences);
    console.log(`Found ${inaccuracies.length} inaccurate claims`);

    // Return the results
    res.json({ inaccuracies });
  } catch (error) {
    console.error("Error in fact-check endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
