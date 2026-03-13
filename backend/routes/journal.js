const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { analyzeEmotion } = require("../services/llm");

const VALID_AMBIENCES = ["forest", "ocean", "mountain", "desert", "meadow", "rain", "cave"];

// POST /api/journal — Create a new journal entry
router.post("/", (req, res) => {
  try {
    const { userId, ambience, text } = req.body;

    if (!userId || typeof userId !== "string" || userId.trim().length === 0)
      return res.status(400).json({ error: "userId is required" });

    if (!ambience || !VALID_AMBIENCES.includes(ambience.toLowerCase()))
      return res.status(400).json({ error: `ambience must be one of: ${VALID_AMBIENCES.join(", ")}` });

    if (!text || typeof text !== "string" || text.trim().length < 10)
      return res.status(400).json({ error: "text must be at least 10 characters" });

    if (text.length > 5000)
      return res.status(400).json({ error: "text must be under 5000 characters" });

    const id = uuidv4();
    const now = new Date().toISOString();

    db.createEntry({
      id,
      user_id: userId.trim(),
      ambience: ambience.toLowerCase(),
      text: text.trim(),
      created_at: now,
    });

    const entry = db.getEntryById(id);

    res.status(201).json({
      message: "Journal entry created successfully",
      entry: formatEntry(entry),
    });
  } catch (err) {
    console.error("POST /journal error:", err);
    res.status(500).json({ error: "Failed to create journal entry" });
  }
});

// GET /api/journal/:userId — Get all entries for a user
router.get("/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, ambience } = req.query;

    const normalizedLimit = Math.min(parseInt(limit) || 50, 100);
    const normalizedOffset = parseInt(offset) || 0;
    const normalizedAmbience =
      ambience && VALID_AMBIENCES.includes(ambience.toLowerCase())
        ? ambience.toLowerCase()
        : undefined;

    const entries = db.getEntriesByUser({
      userId,
      ambience: normalizedAmbience,
      limit: normalizedLimit,
      offset: normalizedOffset,
    });
    const total = db.countEntriesByUser(userId);

    res.json({
      entries: entries.map(formatEntry),
      pagination: { total, limit: normalizedLimit, offset: normalizedOffset },
    });
  } catch (err) {
    console.error("GET /journal/:userId error:", err);
    res.status(500).json({ error: "Failed to fetch journal entries" });
  }
});

// POST /api/journal/analyze — Analyze emotion using LLM
router.post("/analyze", async (req, res) => {
  try {
    const { text, entryId } = req.body;

    if (!text || typeof text !== "string" || text.trim().length < 5)
      return res.status(400).json({ error: "text is required (min 5 characters)" });

    const result = await analyzeEmotion(text.trim());

    if (entryId) {
      db.updateEntryAnalysis({
        entryId,
        emotion: result.emotion,
        keywords: result.keywords,
        summary: result.summary,
        analyzedAt: new Date().toISOString(),
      });
    }

    res.json({
      emotion: result.emotion,
      keywords: result.keywords,
      summary: result.summary,
      cached: result.cached,
    });
  } catch (err) {
    console.error("POST /journal/analyze error:", err);
    if (err.message.includes("API_KEY"))
      return res.status(503).json({ error: "LLM service not configured" });
    res.status(500).json({ error: "Analysis failed", message: err.message });
  }
});

// GET /api/journal/insights/:userId — Get insights for a user
router.get("/insights/:userId", (req, res) => {
  try {
    const { userId } = req.params;

    const totalEntries = db.countEntriesByUser(userId);

    if (totalEntries === 0) {
      return res.json({
        totalEntries: 0,
        topEmotion: null,
        mostUsedAmbience: null,
        recentKeywords: [],
        emotionBreakdown: {},
        ambienceBreakdown: {},
      });
    }

    const topEmotion = db.getTopEmotion(userId);
    const topAmbience = db.getTopAmbience(userId);
    const recentAnalyzed = db.getRecentKeywordRows(userId, 10);

    const keywordFreq = {};
    recentAnalyzed.forEach((row) => {
      try {
        JSON.parse(row.keywords).forEach((kw) => {
          keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
        });
      } catch {}
    });
    const recentKeywords = Object.entries(keywordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([kw]) => kw);

    const emotionRows = db.getEmotionRows(userId);
    const emotionBreakdown = {};
    emotionRows.forEach((r) => (emotionBreakdown[r.emotion] = r.cnt));

    const ambienceRows = db.getAmbienceRows(userId);
    const ambienceBreakdown = {};
    ambienceRows.forEach((r) => (ambienceBreakdown[r.ambience] = r.cnt));

    res.json({
      totalEntries,
      topEmotion: topEmotion || null,
      mostUsedAmbience: topAmbience || null,
      recentKeywords,
      emotionBreakdown,
      ambienceBreakdown,
    });
  } catch (err) {
    console.error("GET /journal/insights error:", err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

function formatEntry(entry) {
  return {
    id: entry.id,
    userId: entry.user_id,
    ambience: entry.ambience,
    text: entry.text,
    emotion: entry.emotion || null,
    keywords: entry.keywords ? JSON.parse(entry.keywords) : null,
    summary: entry.summary || null,
    analyzedAt: entry.analyzed_at || null,
    createdAt: entry.created_at,
  };
}

module.exports = router;
