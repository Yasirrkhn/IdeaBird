import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';
import { buildTweetPipeline } from './tweetPipeline.js';

const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
const API_KEY = process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY || process.env.GEMINI_API_KEY;
const REQUEST_TIMEOUT_MS = Number(process.env.NVIDIA_TIMEOUT_MS || 30000);
const MODEL_ATTEMPTS = Number(process.env.NVIDIA_MODEL_ATTEMPTS || 1);
const MAX_OUTPUT_TOKENS = Number(process.env.NVIDIA_MAX_TOKENS || 1600);

const configuredModels = [
  process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct',
  ...(process.env.NVIDIA_FALLBACK_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean),
];

export const MODEL_CANDIDATES = [...new Set(configuredModels)];
export const NIM_CONFIG = {
  baseUrl: NVIDIA_BASE_URL,
  modelCandidates: MODEL_CANDIDATES,
};

export function assertApiKey() {
  if (!API_KEY) {
    const error = new Error('NVIDIA_API_KEY is missing. Add it to your environment variables.');
    error.status = 401;
    throw error;
  }
}

export async function generateTweetsWithFallback(text) {
  assertApiKey();
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    for (let attempt = 1; attempt <= MODEL_ATTEMPTS; attempt += 1) {
      try {
        console.log(`[IdeaBird] Trying model: ${modelName} (attempt ${attempt}/${MODEL_ATTEMPTS})`);

        const raw = await requestModel(text, modelName, attempt);
        const result = buildTweetPipeline(raw, text);

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
        temperature: attempt === 1 ? 0.72 : 0.64,
        max_tokens: MAX_OUTPUT_TOKENS,
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
      const timeoutError = new Error('NVIDIA NIM timed out. Try again in a few seconds.');
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
