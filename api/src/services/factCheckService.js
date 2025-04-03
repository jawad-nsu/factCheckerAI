import { extractJsonFromText } from "../utils/textUtils.js";
import { fetchSources } from "./sourceService.js";

export async function checkSentences(sentences) {
  // Skip processing if there are no sentences
  if (!sentences || sentences.length === 0) {
    console.log("No sentences to check");
    return [];
  }

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