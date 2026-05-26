# IdeaBird - Screenshot -> Tweet Formatter

Upload a screenshot, extract text via OCR, then generate **5 tweet variations** using **NVIDIA NIM**.

## Features

- **Screenshot upload**: drag/drop, click-to-browse, paste from clipboard
- **OCR extraction** with `tesseract.js` in the browser
- **Tweet generation** via an Express API calling NVIDIA NIM chat completions
- Enforces **exactly 5 variations** and validates output shape

## Tech Stack

- **Client**: Vite + vanilla JS, `tesseract.js`
- **Server**: Node.js ESM + Express, `dotenv`, NVIDIA NIM OpenAI-compatible HTTP API

## Project Structure

- `index.html`, `main.js`, `style.css`: frontend UI, OCR, results rendering
- `server/index.js`: Express API (`POST /api/generate`)
- `server/prompt.js`: system prompt and user prompt builder for the model
- `server/tweetPipeline.js`: parses 20 internal candidates, scores quality, removes weak/duplicate tweets, and selects the best 5

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` file in the project root:

```env
NVIDIA_API_KEY=your_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.3-70b-instruct
NVIDIA_FALLBACK_MODELS=nvidia/llama-3.3-nemotron-super-49b-v1
NVIDIA_TIMEOUT_MS=45000
NVIDIA_MODEL_ATTEMPTS=2
PORT=3001
```

Notes:

- **`NVIDIA_API_KEY` is required**. The server also accepts the old `GEMINI_API_KEY` name as a temporary fallback.
- **`NVIDIA_BASE_URL`** defaults to `https://integrate.api.nvidia.com/v1`.
- **`NVIDIA_MODEL`** defaults to `meta/llama-3.3-70b-instruct`.
- **`NVIDIA_FALLBACK_MODELS`** is an optional comma-separated list tried when the primary model fails.
- **`NVIDIA_TIMEOUT_MS`** defaults to `45000`.
- **`NVIDIA_MODEL_ATTEMPTS`** defaults to `2`.
- **`PORT`** defaults to `3001`.

Security note: never commit real API keys. If a committed env example ever contains a real key, rotate it and replace it with a placeholder.

## Running Locally

### Development (client + server)

```bash
npm run dev
```

- Vite dev server runs on `http://localhost:5173`
- API runs on `http://localhost:3001`
- Vite proxies `/api/*` to `http://localhost:3001` through `vite.config.js`

### Run only the API

```bash
npm run dev:server
```

### Run only the client

```bash
npm run dev:client
```

## Production Build

```bash
npm run build
npm run preview
```

`preview` serves the built frontend only. If you want generation to work in production, you must also run the API server and ensure the frontend can reach it.

## API

### `POST /api/generate`

Body:

```json
{ "text": "string" }
```

Response:

```json
{
  "tweets": [
    { "style": "Hot Take", "tweet": "..." },
    { "style": "Thread Starter", "tweet": "..." },
    { "style": "Storyteller", "tweet": "..." },
    { "style": "Authority", "tweet": "..." },
    { "style": "Minimalist", "tweet": "..." }
  ],
  "model": "nvidia/..."
}
```

Validation:

- Rejects empty text
- Rejects input longer than **10,000 characters**
- Generates a private pool of **20 tweet candidates**
- Scores each candidate for human-likeness, emotional impact, originality, punchiness, and Twitter/X-native style
- Returns only the best **5 diverse tweet objects**, each with `style` and `tweet`

## Troubleshooting

- **Server exits immediately**: ensure `NVIDIA_API_KEY` is set in `.env`.
- **401/403 invalid API key**: check that your key was copied from NVIDIA NIM and has not expired.
- **429 rate limited**: try again later or set `NVIDIA_MODEL` / `NVIDIA_FALLBACK_MODELS` to another available model.
- **503 overloaded**: NVIDIA NIM is temporarily overloaded; retry after a moment.
- **OCR returns empty**: try a higher-contrast screenshot or crop tighter around the text.
