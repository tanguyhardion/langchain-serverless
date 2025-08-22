# LangChain Serverless API

Minimal serverless API for chat, quiz, and text extraction using LangChain.

## Install

```cmd
npm install
```

## Usage

Set up your environment variables in `.env.local` (see `.env.example`).

Run locally:

```cmd
npm run dev
```

Deploy:

```cmd
npm run deploy
```

## Endpoints

- `/api/chat` — Chat
- `/api/quiz` — Quiz from article
- `/api/extract-text` — Extract text from URL
- `/api/health` — Health check

```json
{
  "qaData": {
    "question": "What is the capital of France?",
    "answer": "Paris",
    "contextLarge": "...",
    "contextMedium": "...",
    "contextSmall": "..."
  },
  "userMessage": "I think it's London?",
  "attemptCount": 1
}
```

### POST `/api/quiz`

Generates structured Q&A pairs from article content.

**Request Body:**

```json
{
  "articleInput": "Your article text here..."
}
```

### POST `/api/extract-text`

Extracts clean text from web pages.

**Request Body:**

```json
{
  "url": "https://example.com/article"
}
```

### GET `/api/health`

Returns basic health status.
