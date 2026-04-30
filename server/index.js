import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function debugLog({ runId, hypothesisId, location, message, data }) {
  // #region agent log
  fetch('http://127.0.0.1:7894/ingest/cc16c2fd-d06d-412c-83d2-b285d3358261',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'344ed2'},body:JSON.stringify({sessionId:'344ed2',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

// Validate API key on startup
if (!process.env.GEMINI_API_KEY) {
  console.error('\x1b[31m✗ GEMINI_API_KEY is missing. Copy .env.example to .env and add your key.\x1b[0m');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: SYSTEM_PROMPT,
});

app.post('/api/generate', async (req, res) => {
  const { text } = req.body;
  const runId = `run-${Date.now()}`;

  debugLog({
    runId,
    hypothesisId: 'H1',
    location: 'server/index.js:31',
    message: 'Received generate request',
    data: { textLength: typeof text === 'string' ? text.length : null, textType: typeof text },
  });

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'No text provided. Extract text from a screenshot first.' });
  }

  if (text.length > 10000) {
    return res.status(400).json({ error: 'Text is too long. Please use a shorter excerpt (max 10,000 characters).' });
  }

  try {
    debugLog({
      runId,
      hypothesisId: 'H2',
      location: 'server/index.js:49',
      message: 'Calling Gemini model.generateContent',
      data: { trimmedLength: text.trim().length },
    });
    const result = await model.generateContent(buildUserMessage(text.trim()));
    const raw = result.response.text();

    debugLog({
      runId,
      hypothesisId: 'H2',
      location: 'server/index.js:57',
      message: 'Gemini returned raw response',
      data: { rawLength: typeof raw === 'string' ? raw.length : null, rawPreview: typeof raw === 'string' ? raw.slice(0, 140) : null },
    });

    // Parse JSON from response
    let tweets;
    try {
      tweets = JSON.parse(raw);
    } catch {
      // Try to extract JSON array from response if wrapped in markdown or other text
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        tweets = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse tweet variations from AI response.');
      }
    }

    // Validate structure
    if (!Array.isArray(tweets) || tweets.length !== 5) {
      throw new Error('Expected exactly 5 tweet variations.');
    }

    for (const t of tweets) {
      if (!t.style || !t.tweet) {
        throw new Error('Each variation must have a style and tweet field.');
      }
    }

    return res.json({ tweets });
  } catch (err) {
    console.error('Generate error:', err);
    debugLog({
      runId,
      hypothesisId: 'H3',
      location: 'server/index.js:88',
      message: 'Caught generate error',
      data: {
        name: err?.name,
        message: err?.message,
        status: err?.status ?? null,
        httpCode: err?.httpCode ?? null,
        code: err?.code ?? null,
        details: err?.details ?? null,
      },
    });

    const status = err.status || err.httpCode;
    debugLog({
      runId,
      hypothesisId: 'H4',
      location: 'server/index.js:100',
      message: 'Mapped error status for response',
      data: { derivedStatus: status ?? null },
    });
    if (status === 401 || status === 403) {
      return res.status(401).json({ error: 'Invalid API key. Check your .env file.' });
    }
    if (status === 429) {
      return res.status(429).json({ error: 'Rate limited. Please wait a moment and try again.' });
    }
    if (status === 503) {
      return res.status(503).json({ error: 'Gemini is currently overloaded. Try again in a few seconds.' });
    }

    return res.status(500).json({
      error: err.message || 'Something went wrong generating tweets. Please try again.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`\x1b[32m✓ Yater API running on http://localhost:${PORT}\x1b[0m`);
});
