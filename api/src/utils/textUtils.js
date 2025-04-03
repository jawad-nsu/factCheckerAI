import { split } from "sentence-splitter";

// Helper: Extract factual sentences from article
export function extractSentences(sentences) {
  return split(sentences)
    .filter((e) => e.type === "Sentence")
    .map((s) => s.raw.trim())
    .filter((s) => s.length > 30);
}

// Helper: Extract JSON from mixed response text
export function extractJsonFromText(text) {
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