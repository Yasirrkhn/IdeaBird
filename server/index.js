import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';
import { buildTweetPipeline } from './tweetPipeline.js';

const app = express();
const PORT = process.env.PORT || 3001;
const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
const API_KEY = process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY || process.env.GEMINI_API_KEY;
const REQUEST_TIMEOUT_MS = Number(process.env.NVIDIA_TIMEOUT_MS || 45000);
const MODEL_ATTEMPTS = Number(process.env.NVIDIA_MODEL_ATTEMPTS || 2);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

if (!API_KEY) {
  console.error('\x1b[31mX NVIDIA_API_KEY is missing. Copy .env.example to .env and add your NVIDIA NIM key.\x1b[0m');
  process.exit(1);
}

const configuredModels = [
  process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct',
  ...(process.env.NVIDIA_FALLBACK_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean),
];
const MODEL_CANDIDATES = [...new Set(configuredModels)];

async function generateTweetsWithFallback(text) {
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    for (let attempt = 1; attempt <= MODEL_ATTEMPTS; attempt += 1) {
      try {
        console.log(`[IdeaBird] Trying model: ${modelName} (attempt ${attempt}/${MODEL_ATTEMPTS})`);

        const raw = await requestModel(text, modelName, attempt);
        const result = buildTweetPipeline(raw);

        console.log(
          `[IdeaBird] Pipeline: ${result.diagnostics.generated} generated, ${result.diagnostics.ranked} ranked, ${result.diagnostics.selected} selected`
        );
        console.log(`[IdeaBird] Success with ${modelName}`);

        return { ...result, model: modelName };
      } catch (err) {
        console.error(`[IdeaBird] ${modelName} attempt ${attempt} failed: ${err.status || ''} ${err.message?.substring(0, 140)}`);
        lastError = err;

        if (!shouldRetry(err) && attempt === 1) {
          break;
        }
      }
    }
  }

  throw lastError;
}

async function requestModel(text, modelName, attempt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
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
        temperature: attempt === 1 ? 0.82 : 0.72,
        max_tokens: 2600,
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
      const error = new Error('NVIDIA NIM returned an empty response.');
      error.retryable = true;
      throw error;
    }

    return raw;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('NVIDIA NIM timed out. Retrying with a faster attempt.');
      timeoutError.status = 504;
      timeoutError.retryable = true;
      throw timeoutError;
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function shouldRetry(err) {
  if (err.retryable) return true;
  if ([408, 429, 500, 502, 503, 504].includes(err.status)) return true;
  return /parse|json|select|empty|network|fetch|terminated|timeout/i.test(err.message || '');
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
    const { tweets, model } = await generateTweetsWithFallback(text.trim());

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
