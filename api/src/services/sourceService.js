import axios from "axios";

// Mock source data for testing
const MOCK_SOURCES = [
  {
    title: "Fact Check: Sample Source 1",
    link: "https://example.com/source1",
    snippet: "This is a sample source snippet that would normally come from SerpAPI. It provides context about the claim being fact-checked.",
    source: "example.com"
  },
  {
    title: "Fact Check: Sample Source 2",
    link: "https://example.com/source2",
    snippet: "Another sample source snippet demonstrating how the fact-checking system would work with real data.",
    source: "example.org"
  },
  {
    title: "Fact Check: Sample Source 3",
    link: "https://example.com/source3",
    snippet: "A third sample source to show multiple sources being displayed in the modal.",
    source: "example.net"
  }
];

/**
 * Fetches and validates fact-checking sources for a claim
 * @param {string} claim - The claim to find sources for
 * @param {Object} options - Optional configuration parameters
 * @returns {Promise<Array>} - Array of source objects with metadata
 */
export async function fetchSources(claim, options = {}) {
  console.log('Fetching sources for claim:', claim);
  
  // Return mock sources instead of making API calls
  console.log('Using mock sources instead of SerpAPI');
  return MOCK_SOURCES;
} 