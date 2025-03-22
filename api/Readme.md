# 📘 Fact Checker API - Backend

This is the backend service for a Fact Checker tool built with **Node.js**, **Express**, and **Cohere AI**. It processes articles or paragraphs, checks for **false claims**, and returns **verdicts, explanations, and source links** via SerpAPI.

---

## 🚀 How It Works

-   Accepts an article as plain text
-   Breaks the article into factual sentences
-   Sends each sentence to **Cohere's AI** for fact verification
-   For every **false** claim, it fetches **5 sources** from **SerpAPI**
-   Returns a structured JSON response

---

## 📬 API Endpoint

### `POST http://localhost:5000/fact-check-article`

**Request Body:**

```json
{
    "article": "<your full article or paragraph here>"
}
```

**Response:**
Returns all false claims detected in the article.

### ✅ Sample Response:

```json
[
    {
        "sentence": "It was designed by Gustave Eiffel, who also invented the telephone.",
        "verdict": "False",
        "explanation": "Gustave Eiffel designed the Eiffel Tower, but did not invent the telephone. The telephone was invented by Alexander Graham Bell, and Gustave Eiffel focused on mastering architecture and engineering designs.",
        "sources": [
            {
                "title": "Who Invented the Telephone?",
                "link": "https://example.com/telephone-history",
                "snippet": "Alexander Graham Bell is credited with inventing the telephone..."
            },
            {
                "title": "Gustave Eiffel Biography",
                "link": "https://example.com/eiffel-biography",
                "snippet": "Learn more about the architectural legacy of Gustave Eiffel..."
            }
            // ... up to 5 sources
        ]
    }
]
```

---

## ⚙️ Technologies Used

-   Node.js + Express
-   Cohere API (text generation)
-   SerpAPI (Google Search / News)
-   sentence-splitter (for parsing article text)

---

## 🧪 Development

1. Clone this repo
2. Run `npm install`
3. Create a `.env` file with:
    ```env
    COHERE_API_KEY=your_cohere_key_here
    SERP_API_KEY=your_serpapi_key_here
    ```
4. Run the server:
    ```bash
    node server.js
    ```

---

## 🧠 Future Enhancements

-   Add caching for repeated queries
-   Support full article summaries
-   Stream response tokens from Cohere
-   Add support for both true and false claims (configurable)

---

## 🧩 Frontend Available?

Yes — see `/public/index.html` for a ready-to-use frontend (HTML + TailwindCSS).

---

## 🧑‍💻 Author

Built with ❤️ by [Your Name] · Powered by Cohere & SerpAPI
