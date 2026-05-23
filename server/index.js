import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';

const app = express();
const PORT = process.env.PORT || 3001;
const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
const API_KEY = process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY || process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

if (!API_KEY) {
  console.error('\x1b[31mX NVIDIA_API_KEY is missing. Copy .env.example to .env and add your NVIDIA NIM key.\x1b[0m');
  process.exit(1);
}

const configuredModels = [
  process.env.NVIDIA_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1',
  ...(process.env.NVIDIA_FALLBACK_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean),
];
const MODEL_CANDIDATES = [...new Set(configuredModels)];

async function generateWithFallback(text) {
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      console.log(`[IdeaBird] Trying model: ${modelName}`);

      const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserMessage(text) },
          ],
          temperature: 0.9,
          max_tokens: 2048,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload.error?.message || payload.detail || response.statusText || 'NVIDIA NIM request failed';
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      const raw = payload.choices?.[0]?.message?.content;
      if (!raw) {
        throw new Error('NVIDIA NIM returned an empty response.');
      }

      console.log(`[IdeaBird] Success with ${modelName}`);
      return { raw, model: modelName };
    } catch (err) {
      console.error(`[IdeaBird] ${modelName} failed: ${err.status || ''} ${err.message?.substring(0, 120)}`);
      lastError = err;

      if ([404, 429, 503].includes(err.status)) {
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

function escapeControlCharsInJsonStrings(value) {
  let output = '';
  let inString = false;
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      output += char;
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      output += char;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        output += '\\n';
        continue;
      }
      if (char === '\r') {
        output += '\\r';
        continue;
      }
      if (char === '\t') {
        output += '\\t';
        continue;
      }
    }

    output += char;
  }

  return output;
}

function extractFirstJsonArray(value) {
  const start = value.indexOf('[');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        return value.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseTweetVariations(raw) {
  const candidates = [raw];
  const array = extractFirstJsonArray(raw);
  if (array && array !== raw) {
    candidates.push(array);
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastError = err;
    }

    try {
      return JSON.parse(escapeControlCharsInJsonStrings(candidate));
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Could not parse tweet variations from AI response.');
}

app.post('/api/generate', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'No text provided. Extract text from a screenshot first.' });
  }

  if (text.length > 10000) {
    return res.status(400).json({ error: 'Text is too long. Please use a shorter excerpt (max 10,000 characters).' });
  }

  try {
    const { raw, model } = await generateWithFallback(text.trim());
    const tweets = parseTweetVariations(raw);

    if (!Array.isArray(tweets) || tweets.length !== 5) {
      throw new Error('Expected exactly 5 tweet variations.');
    }

    for (const t of tweets) {
      if (!t.style || !t.tweet) {
        throw new Error('Each variation must have a style and tweet field.');
      }
    }

    return res.json({ tweets, model });
  } catch (err) {
    console.error('Generate error:', err.message || err);

    const status = err.status || err.httpCode;
    if (status === 401 || status === 403) {
      return res.status(401).json({ error: 'Invalid API key. Check your .env file.' });
    }
    if (status === 429) {
      return res.status(429).json({
        error: 'NVIDIA NIM rate limit or quota was reached. Try again later or set NVIDIA_MODEL / NVIDIA_FALLBACK_MODELS to another available model.',
      });
    }
    if (status === 503) {
      return res.status(503).json({ error: 'NVIDIA NIM is currently overloaded. Try again in a few seconds.' });
    }

    return res.status(500).json({
      error: err.message || 'Something went wrong generating tweets. Please try again.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`\x1b[32mIdeaBird API running on http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[36m  NVIDIA NIM endpoint: ${NVIDIA_BASE_URL}\x1b[0m`);
  console.log(`\x1b[36m  Models: ${MODEL_CANDIDATES.join(' -> ')} (fallback chain)\x1b[0m`);
});
