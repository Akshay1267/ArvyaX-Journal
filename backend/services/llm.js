const NodeCache = require("node-cache");
const crypto = require("crypto");

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

function getCacheKey(text) {
  return crypto
    .createHash("sha256")
    .update(text.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

async function callLLM(text) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const prompt = `Analyze the emotional content of this journal entry and respond with ONLY valid JSON (no markdown, no explanation):

Journal entry: "${text}"

Respond with exactly this JSON structure:
{
  "emotion": "<primary emotion in one word, e.g. calm, anxious, joyful, melancholic, grateful, overwhelmed, peaceful, excited>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "summary": "<one sentence summarizing the user's mental state>"
}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 300,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const rawText = data.choices[0]?.message?.content?.trim();
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed.emotion || !Array.isArray(parsed.keywords) || !parsed.summary) {
    throw new Error("LLM returned invalid structure");
  }

  return {
    emotion: String(parsed.emotion).toLowerCase(),
    keywords: parsed.keywords.slice(0, 5).map((k) => String(k).toLowerCase()),
    summary: String(parsed.summary),
  };
}

async function analyzeEmotion(text) {
  const cacheKey = getCacheKey(text);
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };
  const result = await callLLM(text);
  cache.set(cacheKey, result);
  return { ...result, cached: false };
}

function getCacheStats() {
  return cache.getStats();
}

module.exports = { analyzeEmotion, getCacheStats };