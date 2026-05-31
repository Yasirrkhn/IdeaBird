import { generateTweetsWithFallback } from '../server/generateService.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      return res.status(400).json({ error: 'Invalid JSON request body.' });
    }
  }
  const { text } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'No text provided. Extract text from a screenshot first.' });
  }

  if (text.length > 10000) {
    return res.status(400).json({ error: 'Text is too long. Please use a shorter excerpt (max 10,000 characters).' });
  }

  try {
    const { tweets, model } = await generateTweetsWithFallback(text.trim());
    return res.status(200).json({ tweets, model });
  } catch (err) {
    return sendGenerateError(res, err);
  }
}

function sendGenerateError(res, err) {
  console.error('Generate error:', err.message || err);

  const status = err.status || err.httpCode;
  if (status === 401 || status === 403) {
    return res.status(401).json({ error: 'Invalid or missing NVIDIA API key. Add NVIDIA_API_KEY in your Vercel project environment variables.' });
  }
  if (status === 429) {
    return res.status(429).json({
      error: 'NVIDIA NIM rate limit or quota was reached. Try again later or set NVIDIA_MODEL / NVIDIA_FALLBACK_MODELS to another available model.',
    });
  }
  if (status === 503) {
    return res.status(503).json({ error: 'NVIDIA NIM is currently overloaded. Try again in a few seconds.' });
  }

  return res.status(status || 500).json({
    error: err.message || 'Something went wrong generating tweets. Please try again.',
  });
}
