import { STYLE_LANES } from './prompt.js';

const CLICHE_PHRASES = [
  'game changer',
  'level up',
  'take it to the next level',
  'unlock',
  'journey',
  'mastery',
  'growth mindset',
  'crush it',
  'skyrocket',
  'supercharge',
  'transform your life',
  'dream big',
  'work smarter',
  'hustle',
  'grind',
  'success',
  'thrive',
  'empower',
  'elevate',
  'in today\'s fast-paced world',
  'in the digital age',
  'at the end of the day',
];

const CORPORATE_PHRASES = [
  'streamline',
  'optimize',
  'leverage',
  'synergy',
  'robust',
  'scalable',
  'actionable insights',
  'best practices',
  'drive results',
  'enhance productivity',
  'seamless',
  'innovative solution',
  'value proposition',
  'stakeholders',
  'efficient workflow',
];

const AI_PHRASES = [
  'it\'s not about',
  'it\'s about',
  'here\'s the thing',
  'the truth is',
  'what\'s real',
  'the real',
  'let that sink in',
  'read that again',
  'this is your sign',
  'imagine a world',
  'more than just',
  'whether you\'re',
  'at all',
];

const GENERIC_SOCIAL_PHRASES = [
  'truth matters',
  'this matters',
  'people need to know',
  'wake up',
  'the stakes are high',
  'everything is changing',
  'pay attention',
  'big if true',
  'let that sink in',
  'this changes everything',
];

const EMOTION_WORDS = [
  'afraid',
  'fear',
  'ashamed',
  'lonely',
  'quiet',
  'pretend',
  'honest',
  'hurt',
  'tired',
  'want',
  'need',
  'avoid',
  'hide',
  'expose',
  'small',
  'still',
  'never',
  'almost',
  'enough',
  'wrong',
  'real',
  'secret',
  'truth',
];

const ABSTRACT_WORDS = [
  'paradox',
  'aspiration',
  'reality',
  'liberation',
  'potential',
  'capacity',
  'confronting',
  'inadequacy',
  'vulnerability',
  'stagnation',
  'perfection',
  'imperfection',
  'self-censorship',
  'authenticity',
  'courage',
  'quality',
  'progress',
  'skill gap',
  'aspirations',
  'exposure',
  'produce',
  'craft',
  'brutal',
  'mirror',
  'verdict',
];

const NATURAL_OPENERS = [
  'maybe',
  'honestly',
  'i think',
  'feels like',
  'sometimes',
  'idk',
  'not gonna lie',
  'the weird part',
  'the worst part',
];

const STYLE_ALIASES = new Map([
  ['clear', 'Clear Rewrite'],
  ['clear rewrite', 'Clear Rewrite'],
  ['rewrite', 'Clear Rewrite'],
  ['neutral', 'Neutral Summary'],
  ['neutral summary', 'Neutral Summary'],
  ['summary', 'Neutral Summary'],
  ['viral', 'Viral Framing'],
  ['viral framing', 'Viral Framing'],
  ['emotional', 'Emotional Framing'],
  ['emotional framing', 'Emotional Framing'],
  ['news', 'News Style'],
  ['news style', 'News Style'],
  ['contrarian', 'Contrarian Angle'],
  ['contrarian angle', 'Contrarian Angle'],
  ['hot take', 'Contrarian Angle'],
  ['simplified', 'Simplified Explanation'],
  ['simple', 'Simplified Explanation'],
  ['simplified explanation', 'Simplified Explanation'],
]);

export function buildTweetPipeline(rawModelOutput, sourceText = '') {
  const candidates = parseTweetCandidates(rawModelOutput);
  const sourceInsights = extractSourceInsights(sourceText);
  const ranked = rankTweetCandidatesInternal(candidates, { includeRejected: true, sourceInsights });
  const targetCount = STYLE_LANES.length;
  const selected = fillToTarget(selectDiverseTweets(ranked, targetCount), ranked, targetCount);

  if (selected.length !== targetCount) {
    throw new Error(`Could not select ${targetCount} high-quality rewrite variations. Parsed ${candidates.length}, ranked ${ranked.length}, selected ${selected.length}.`);
  }

  return {
    tweets: selected.map(({ style, tweet }) => ({ style, tweet })),
    diagnostics: {
      generated: candidates.length,
      ranked: ranked.length,
      selected: selected.length,
      rejected: candidates.length - ranked.length,
    },
  };
}

function fillToTarget(selected, rankedCandidates, targetCount) {
  const output = [...selected];

  for (const candidate of rankedCandidates) {
    if (output.length >= targetCount) break;
    if (!output.includes(candidate)) {
      output.push(candidate);
    }
  }

  return output.slice(0, targetCount);
}

export function parseTweetCandidates(raw) {
  const parsed = parseJsonArray(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected an array of tweet candidates.');
  }

  return parsed
    .map(normalizeCandidate)
    .filter((candidate) => candidate.style && candidate.tweet);
}

export function rankTweetCandidates(candidates) {
  return rankTweetCandidatesInternal(candidates, { includeRejected: false, sourceInsights: extractSourceInsights('') });
}

function rankTweetCandidatesInternal(candidates, { includeRejected, sourceInsights }) {
  return candidates
    .map((candidate, index) => {
      const evaluation = evaluateTweet(candidate, candidates, sourceInsights);
      return { ...candidate, index, evaluation };
    })
    .filter(({ evaluation }) => includeRejected || !evaluation.rejected)
    .sort((a, b) => b.evaluation.total - a.evaluation.total);
}

export function evaluateTweet(candidate, allCandidates = [], sourceInsights = extractSourceInsights('')) {
  const tweet = normalizeWhitespace(candidate.tweet);
  const lower = tweet.toLowerCase();
  const words = lower.match(/[a-z0-9']+/g) || [];
  const wordCount = words.length;
  const sentenceCount = Math.max(1, (tweet.match(/[.!?]+/g) || []).length);
  const avgSentenceLength = wordCount / sentenceCount;
  const realismScore = controlledImperfectionScore(tweet, lower, words);
  const polishPenalty = overPolishedPenalty(tweet, lower);
  const contextScore = sourceContextScore(tweet, sourceInsights);
  const vaguenessPenalty = vagueRewritePenalty(tweet, lower, sourceInsights);

  const phrasePenalty =
    countMatches(lower, CLICHE_PHRASES) * 13 +
    countMatches(lower, CORPORATE_PHRASES) * 16 +
    countMatches(lower, AI_PHRASES) * 10 +
    countMatches(lower, GENERIC_SOCIAL_PHRASES) * 15 +
    polishPenalty;

  const humanLikeness =
    22 +
    (/\b(i|you|we|me|us|your|my)\b/i.test(tweet) ? 8 : 0) +
    (/\b(can't|don't|isn't|won't|you're|i'm|we're|they're|that's)\b/i.test(tweet) ? 6 : 0) +
    (avgSentenceLength <= 13 ? 7 : 0) +
    (wordCount >= 8 && wordCount <= 38 ? 7 : 0) +
    realismScore -
    phrasePenalty * 0.35;

  const emotionalImpact =
    16 +
    countMatches(lower, EMOTION_WORDS) * 3 +
    (/[?]/.test(tweet) ? 3 : 0) +
    (/\bbut\b|\bstill\b|\bnever\b|\balmost\b|\bafraid\b|\bhate\b|\bscared\b/i.test(tweet) ? 7 : 0) +
    (/\b(feels?|hurt|tired|want|hate|scared)\b/i.test(tweet) ? 5 : 0) -
    (wordCount > 45 ? 7 : 0);

  const originality =
    16 +
    uniqueRatio(words) * 14 +
    (hasUnexpectedContrast(tweet) ? 6 : 0) -
    similarityPenalty(candidate, allCandidates) -
    phrasePenalty * 0.25 -
    countMatches(lower, ABSTRACT_WORDS) * 2;

  const punchiness =
    18 +
    (tweet.length >= 60 && tweet.length <= 220 ? 11 : 0) +
    (tweet.length <= 180 ? 5 : 0) +
    (avgSentenceLength <= 11 ? 7 : 0) -
    (tweet.length > 240 ? 14 : 0) -
    (tweet.length < 45 ? 10 : 0) -
    (wordCount > 52 ? 10 : 0) -
    (tweet.includes(':') && candidate.style !== 'News Style' ? 3 : 0);

  const platformNative =
    18 +
    (!tweet.includes('#') ? 5 : -12) +
    (!/https?:\/\//i.test(tweet) ? 4 : -12) +
    (countEmoji(tweet) <= 1 ? 3 : -8) +
    (tweet.length <= 220 ? 5 : 0) +
    (startsNaturally(lower) ? 5 : 0) -
    phrasePenalty * 0.4;

  const rejected =
    tweet.length === 0 ||
    tweet.length > 280 ||
    tweet.length < 35 ||
    phrasePenalty >= 28 ||
    vaguenessPenalty >= 18 ||
    looksLikeLinkedIn(lower) ||
    overExplains(tweet);

  return {
    total: Math.round(
      humanLikeness +
      emotionalImpact +
      originality +
      punchiness +
      platformNative +
      contextScore -
      phrasePenalty -
      vaguenessPenalty -
      (rejected ? 30 : 0)
    ),
    humanLikeness: Math.round(humanLikeness),
    emotionalImpact: Math.round(emotionalImpact),
    originality: Math.round(originality),
    punchiness: Math.round(punchiness),
    platformNative: Math.round(platformNative),
    context: Math.round(contextScore),
    vaguenessPenalty,
    phrasePenalty,
    realismScore,
    polishPenalty,
    rejected,
  };
}

export function selectDiverseTweets(rankedCandidates, targetCount = STYLE_LANES.length) {
  const selected = [];
  const usedStyles = new Set();

  for (const style of STYLE_LANES) {
    const match = rankedCandidates.find((candidate) =>
      candidate.style === style &&
      !selected.some((existing) => isDuplicate(existing.tweet, candidate.tweet, 0.62))
    );

    if (match) {
      selected.push(match);
      usedStyles.add(style);
    }
  }

  for (const candidate of rankedCandidates) {
    if (selected.length >= targetCount) break;
    if (selected.some((existing) => isDuplicate(existing.tweet, candidate.tweet, 0.62))) continue;

    if (usedStyles.has(candidate.style) && selected.length < Math.min(targetCount, STYLE_LANES.length)) {
      const missingStyles = STYLE_LANES.some((style) => !usedStyles.has(style));
      if (missingStyles) continue;
    }

    selected.push(candidate);
    usedStyles.add(candidate.style);
  }

  for (const style of STYLE_LANES) {
    if (selected.length >= targetCount) break;
    if (usedStyles.has(style)) continue;

    const match = rankedCandidates.find((candidate) =>
      candidate.style === style &&
      !selected.includes(candidate) &&
      !selected.some((existing) => isDuplicate(existing.tweet, candidate.tweet, 0.86))
    );

    if (match) {
      selected.push(match);
      usedStyles.add(style);
    }
  }

  for (const style of STYLE_LANES) {
    if (selected.length >= targetCount) break;
    if (usedStyles.has(style)) continue;

    const match = rankedCandidates.find((candidate) => candidate.style === style && !selected.includes(candidate));
    if (match) {
      selected.push(match);
      usedStyles.add(style);
    }
  }

  for (const candidate of rankedCandidates) {
    if (selected.length >= targetCount) break;
    if (selected.includes(candidate)) continue;
    if (selected.some((existing) => isDuplicate(existing.tweet, candidate.tweet, 0.86))) continue;

    selected.push(candidate);
    usedStyles.add(candidate.style);
  }

  for (const candidate of rankedCandidates) {
    if (selected.length >= targetCount) break;
    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  return selected
    .slice(0, targetCount)
    .sort((a, b) => STYLE_LANES.indexOf(a.style) - STYLE_LANES.indexOf(b.style));
}

function normalizeCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return { style: null, tweet: '' };
  }

  return {
    style: normalizeStyle(candidate.style),
    tweet: normalizeWhitespace(String(candidate.tweet || '')),
  };
}

function normalizeStyle(style) {
  const normalized = normalizeWhitespace(String(style || '')).toLowerCase();
  return STYLE_ALIASES.get(normalized) || STYLE_LANES.find((lane) => lane.toLowerCase() === normalized) || null;
}

function extractSourceInsights(sourceText) {
  const source = normalizeWhitespace(String(sourceText || ''));
  const entities = extractEntities(source);
  const dates = extractDatesAndDeadlines(source);
  const numbers = extractNumbers(source);

  return {
    hasSource: source.length > 0,
    entities,
    dates,
    numbers,
    concreteTerms: [...new Set([...entities, ...dates, ...numbers])],
  };
}

function extractEntities(source) {
  const entities = new Set();

  for (const match of source.matchAll(/\b(?:[A-Z][a-zA-Z0-9&.'-]{2,})(?:\s+(?:[A-Z][a-zA-Z0-9&.'-]{2,}|of|and|the|for|to)){0,5}/g)) {
    const value = cleanSourceTerm(match[0]);
    if (isUsefulSourceTerm(value)) entities.add(value);
  }

  for (const match of source.matchAll(/\b[A-Z]{2,}(?:-[A-Z0-9]+)?\b/g)) {
    const value = cleanSourceTerm(match[0]);
    if (isUsefulSourceTerm(value)) entities.add(value);
  }

  return [...entities].slice(0, 18);
}

function extractDatesAndDeadlines(source) {
  const dates = new Set();
  const patterns = [
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?\b/gi,
    /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?(?:\s+\d{4})?\b/gi,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
    /\b(?:19|20)\d{2}\b/g,
    /\b(?:today|tomorrow|yesterday|deadline|hearing|vote|trial|launch|release)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      dates.add(cleanSourceTerm(match[0]));
    }
  }

  return [...dates].slice(0, 12);
}

function extractNumbers(source) {
  const numbers = new Set();

  for (const match of source.matchAll(/\b\$?\d+(?:[.,]\d+)*(?:\s?(?:million|billion|trillion|k|m|bn|%|percent))?\b/gi)) {
    numbers.add(cleanSourceTerm(match[0]));
  }

  return [...numbers].slice(0, 12);
}

function cleanSourceTerm(value) {
  return normalizeWhitespace(value)
    .replace(/^[^a-zA-Z0-9$]+|[^a-zA-Z0-9.%]+$/g, '')
    .trim();
}

function isUsefulSourceTerm(value) {
  if (!value || value.length < 3) return false;
  if (/^(The|This|That|And|But|For|With|From|Your|You|They|Their|There|Here|What|When|Where|Why|How|Raw Text)$/i.test(value)) return false;
  return true;
}

function sourceContextScore(tweet, sourceInsights) {
  if (!sourceInsights.hasSource) return 0;

  const lowerTweet = tweet.toLowerCase();
  const matchedConcrete = sourceInsights.concreteTerms.filter((term) => lowerTweet.includes(term.toLowerCase())).length;
  const matchedEntities = sourceInsights.entities.filter((term) => lowerTweet.includes(term.toLowerCase())).length;
  const matchedDates = sourceInsights.dates.filter((term) => lowerTweet.includes(term.toLowerCase())).length;
  const matchedNumbers = sourceInsights.numbers.filter((term) => lowerTweet.includes(term.toLowerCase())).length;

  return Math.min(24, matchedConcrete * 5 + matchedEntities * 3 + matchedDates * 4 + matchedNumbers * 3);
}

function vagueRewritePenalty(tweet, lower, sourceInsights) {
  let penalty = 0;
  const wordCount = (lower.match(/[a-z0-9']+/g) || []).length;

  if (wordCount < 7) penalty += 10;
  if (tweet.length < 60) penalty += 6;
  if (countMatches(lower, GENERIC_SOCIAL_PHRASES) > 0) penalty += 12;
  if (/\b(truth|secrecy|controversy|tension|deadline|matter|matters)\b/i.test(tweet) && tweet.length < 90) penalty += 7;

  if (sourceInsights.hasSource && sourceInsights.concreteTerms.length > 0) {
    const matchedConcrete = sourceInsights.concreteTerms.some((term) => lower.includes(term.toLowerCase()));
    if (!matchedConcrete) penalty += 10;
  }

  return penalty;
}

function parseJsonArray(raw) {
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

  const repaired = parseMalformedCandidates(raw);
  if (repaired.length >= 5) {
    return repaired;
  }

  throw lastError || new Error('Could not parse tweet candidates from AI response.');
}

function parseMalformedCandidates(raw) {
  const repaired = [];

  for (const match of raw.matchAll(/\{\s*"style"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"tweet"\s*:\s*"((?:\\.|[^"\\])*)"\s*\}/g)) {
    repaired.push({ style: decodeJsonString(match[1]), tweet: decodeJsonString(match[2]) });
  }

  for (const match of raw.matchAll(/\{\s*"tweet"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"style"\s*:\s*"((?:\\.|[^"\\])*)"\s*\}/g)) {
    repaired.push({ style: decodeJsonString(match[2]), tweet: decodeJsonString(match[1]) });
  }

  for (const match of raw.matchAll(/\[\s*"((?:\\.|[^"\\])*)"\s*,\s*"style"\s*:\s*"((?:\\.|[^"\\])*)"\s*\]/g)) {
    repaired.push({ style: decodeJsonString(match[2]), tweet: decodeJsonString(match[1]) });
  }

  return repaired;
}

function decodeJsonString(value) {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value;
  }
}

function extractFirstJsonArray(value) {
  const start = value.indexOf('[');
  if (start === -1) return null;

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
    if (inString) continue;

    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }

  return null;
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
    if (inString && char === '\n') {
      output += '\\n';
      continue;
    }
    if (inString && char === '\r') {
      output += '\\r';
      continue;
    }
    if (inString && char === '\t') {
      output += '\\t';
      continue;
    }
    output += char;
  }

  return output;
}

function normalizeWhitespace(value) {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function countMatches(value, phrases) {
  return phrases.reduce((count, phrase) => count + (value.includes(phrase) ? 1 : 0), 0);
}

function uniqueRatio(words) {
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

function hasUnexpectedContrast(tweet) {
  return /\bbut\b|\byet\b|\bexcept\b|\binstead\b|\bactually\b|\bpretend\b/i.test(tweet);
}

function looksLikeLinkedIn(lower) {
  return (
    lower.includes('excited to share') ||
    lower.includes('i am thrilled') ||
    lower.includes('key takeaway') ||
    lower.includes('valuable lesson') ||
    lower.includes('professional') ||
    lower.includes('networking') ||
    lower.includes('leadership')
  );
}

function overExplains(tweet) {
  const commas = (tweet.match(/,/g) || []).length;
  const clauses = (tweet.match(/\bbecause\b|\bwhich\b|\btherefore\b|\bhowever\b|\bmoreover\b|\bin order to\b|\bultimately\b/gi) || []).length;
  return tweet.length > 230 || commas >= 4 || clauses >= 2 || hasSymmetricalStructure(tweet);
}

function controlledImperfectionScore(tweet, lower, words) {
  let score = 0;

  if (startsNaturally(lower)) score += 6;
  if (/\b(i|me|my|you|your)\b/i.test(tweet)) score += 4;
  if (/\b(scared|afraid|hate|tired|weird|awkward|messy|stuck|bad)\b/i.test(tweet)) score += 5;
  if (/\.\.\.$|—$|-$/.test(tweet.trim())) score += 5;
  if (tweet.includes('...')) score += 3;
  if (words.length >= 7 && words.length <= 26) score += 5;
  if (!tweet.includes(':') && !tweet.includes(';')) score += 3;

  return Math.min(score, 18);
}

function overPolishedPenalty(tweet, lower) {
  let penalty = 0;

  penalty += countMatches(lower, ABSTRACT_WORDS) * 4;
  if (/\b(fear|delayed|creative|creation|draft|work)\s+of\b/i.test(tweet)) penalty += 5;
  if (/\bthe\s+real\b|\bwhat's real\b|\bwhat is real\b/i.test(tweet)) penalty += 6;
  if (hasSymmetricalStructure(tweet)) penalty += 8;
  if (tweet.includes(':') && tweet.length > 110) penalty += 5;
  if (/\bnot\b.+\bbut\b/i.test(tweet)) penalty += 6;
  if (/\bbetween\b.+\band\b/i.test(tweet)) penalty += 5;
  if (/\bthe\s+\w+\s+of\s+\w+/i.test(tweet)) penalty += 4;

  return penalty;
}

function startsNaturally(lower) {
  return NATURAL_OPENERS.some((opener) => lower.startsWith(opener));
}

function hasSymmetricalStructure(tweet) {
  return (
    /\bnot\b.{4,80}\bbut\b/i.test(tweet) ||
    /\bbetween\b.{4,80}\band\b/i.test(tweet) ||
    /\bfrom\b.{4,80}\bto\b/i.test(tweet) ||
    /\bthe\s+\w+\s+isn't\b.{4,80}\bit's\b/i.test(tweet)
  );
}

function similarityPenalty(candidate, allCandidates) {
  const normalized = tokenize(candidate.tweet);
  if (normalized.length === 0) return 0;

  const maxSimilarity = allCandidates.reduce((max, other) => {
    if (other === candidate || !other?.tweet) return max;
    return Math.max(max, jaccard(normalized, tokenize(other.tweet)));
  }, 0);

  if (maxSimilarity > 0.82) return 18;
  if (maxSimilarity > 0.68) return 10;
  if (maxSimilarity > 0.55) return 5;
  return 0;
}

function isDuplicate(a, b, threshold) {
  return normalizeForCompare(a) === normalizeForCompare(b) || jaccard(tokenize(a), tokenize(b)) > threshold;
}

function normalizeForCompare(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function tokenize(value) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'are', 'it', 'that']);
  return normalizeForCompare(value)
    .split(' ')
    .filter((word) => word && !stopWords.has(word));
}

function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }

  return intersection / (setA.size + setB.size - intersection);
}

function countEmoji(value) {
  return (value.match(/\p{Extended_Pictographic}/gu) || []).length;
}
