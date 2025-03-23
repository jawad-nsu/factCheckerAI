// ✅ server.js (Full Optimized Code)

import express from "express";
import cors from "cors";
import { CohereClient } from "cohere-ai";
import dotenv from "dotenv";
import { split } from "sentence-splitter";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

app.use(cors());
app.use(express.json());

// Helper: Extract and group sentences with contextual awareness
function extractSentences(articleText) {
    const sentences = split(articleText)
        .filter((e) => e.type === "Sentence")
        .map((s) => s.raw.trim())
        .filter((s) => s.length > 30);

    const grouped = [];
    let currentGroup = [];

    // Group sentences connected by conjunctions/transitions
    const TRANSITION_WORDS = new Set([
        "and",
        "but",
        "however",
        "although",
        "moreover",
        "furthermore",
        "nevertheless",
        "therefore",
        "thus",
    ]);

    sentences.forEach((sentence, index) => {
        const words = sentence.split(/[ ,]+/);
        const firstWord = words[0].toLowerCase();
        const lastChar = sentence.trim().slice(-1);

        // Check if sentence starts with transition or lowercase
        const isContinuation =
            TRANSITION_WORDS.has(firstWord) ||
            /^[a-z]/.test(sentence) ||
            lastChar !== "."; // Handle trailing commas/semicolons

        if (isContinuation && currentGroup.length > 0) {
            currentGroup[currentGroup.length - 1] += " " + sentence;
        } else {
            if (currentGroup.length > 0) grouped.push(currentGroup.join(" "));
            currentGroup = [sentence];
        }
    });

    if (currentGroup.length > 0) grouped.push(currentGroup.join(" "));

    return grouped;
}

// Helper: Extract JSON from mixed response text
function extractJsonFromText(text) {
    try {
        text = text
            .trim()
            .replace(/^```json|```$/g, "")
            .replace(/,(?=\s*?[}\]])/g, ""); // Fix trailing commas

        // Handle incomplete JSON
        if (!text.startsWith("[")) text = `[${text}]`;

        const parsed = JSON.parse(text);

        // Validate structure
        return parsed
            .filter((item) => item.claim && item.verdict && item.reasoning)
            .map((item) => ({
                ...item,
                verdict:
                    item.verdict.charAt(0).toUpperCase() +
                    item.verdict.slice(1).toLowerCase(),
            }));
    } catch (err) {
        console.error("JSON extraction failed:", err);
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
    const numbered = sentences
        .map((s, i) => `${i + 1}. ${s.replace(/\n/g, " ")}`)
        .join("\n");

    const prompt = `
Analyze these statements as a professional fact-checker. Consider multi-sentence claims as single units.
Return a JSON array with these fields for each claim:
- claim: The full text of the factual assertion (may contain multiple sentences)
- verdict: "True", "False", or "Unverified"
- reasoning: Concise analysis of evidence
- needs_context: Whether the claim requires surrounding context for verification

Follow these rules:
1. Group dependent clauses with their main statements
2. Treat transitional phrases as part of previous claims
3. Ignore rhetorical questions and opinions

Example response:
[
    {
        "claim": "COVID-19 vaccines contain microchips that track recipients. This was confirmed by a Pfizer executive.",
        "verdict": "False",
        "reasoning": "No credible evidence supports vaccine microchips. Pfizer executives have never made such claims.",
        "needs_context": false
    }
]

Statements to analyze:
${numbered}

Respond with only the JSON array:`;

    console.log("🧠 Optimized prompt:\n", prompt);

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
            console.log(`🔗 Fetching sources for: \"${result.claim}\"`);
            result.sources = await fetchSources(result.claim);
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
            article,
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
