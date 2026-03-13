const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "data");
const DB_PATH = path.join(dataDir, "arvyax.db");
const JSON_DB_PATH = path.join(dataDir, "arvyax.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let sqliteDb = null;

try {
  const Database = require("better-sqlite3");
  sqliteDb = new Database(DB_PATH);

  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ambience TEXT NOT NULL,
      text TEXT NOT NULL,
      emotion TEXT,
      keywords TEXT,
      summary TEXT,
      analyzed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at);
    CREATE INDEX IF NOT EXISTS idx_journal_ambience ON journal_entries(ambience);
    CREATE INDEX IF NOT EXISTS idx_journal_emotion ON journal_entries(emotion);
  `);

  console.log("SQLite database initialized at:", DB_PATH);
} catch (err) {
  console.warn("better-sqlite3 unavailable, using JSON storage fallback.");
}

function loadJsonStore() {
  if (!fs.existsSync(JSON_DB_PATH)) {
    return { journal_entries: [] };
  }

  try {
    const raw = fs.readFileSync(JSON_DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.journal_entries || !Array.isArray(parsed.journal_entries)) {
      return { journal_entries: [] };
    }
    return parsed;
  } catch {
    return { journal_entries: [] };
  }
}

function saveJsonStore(store) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(store, null, 2), "utf8");
}

function createEntry(entry) {
  if (sqliteDb) {
    sqliteDb
      .prepare(
        `
        INSERT INTO journal_entries (id, user_id, ambience, text, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
      )
      .run(entry.id, entry.user_id, entry.ambience, entry.text, entry.created_at);
    return;
  }

  const store = loadJsonStore();
  store.journal_entries.push({
    id: entry.id,
    user_id: entry.user_id,
    ambience: entry.ambience,
    text: entry.text,
    emotion: null,
    keywords: null,
    summary: null,
    analyzed_at: null,
    created_at: entry.created_at,
  });
  saveJsonStore(store);
}

function getEntryById(id) {
  if (sqliteDb) {
    return sqliteDb.prepare("SELECT * FROM journal_entries WHERE id = ?").get(id);
  }

  const store = loadJsonStore();
  return store.journal_entries.find((entry) => entry.id === id) || null;
}

function getEntriesByUser({ userId, ambience, limit, offset }) {
  if (sqliteDb) {
    let query = "SELECT * FROM journal_entries WHERE user_id = ?";
    const params = [userId];

    if (ambience) {
      query += " AND ambience = ?";
      params.push(ambience);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    return sqliteDb.prepare(query).all(...params);
  }

  const store = loadJsonStore();
  let rows = store.journal_entries.filter((entry) => entry.user_id === userId);

  if (ambience) {
    rows = rows.filter((entry) => entry.ambience === ambience);
  }

  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return rows.slice(offset, offset + limit);
}

function countEntriesByUser(userId) {
  if (sqliteDb) {
    return sqliteDb
      .prepare("SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?")
      .get(userId).count;
  }

  const store = loadJsonStore();
  return store.journal_entries.filter((entry) => entry.user_id === userId).length;
}

function updateEntryAnalysis({ entryId, emotion, keywords, summary, analyzedAt }) {
  if (sqliteDb) {
    sqliteDb
      .prepare(
        `
        UPDATE journal_entries
        SET emotion = ?, keywords = ?, summary = ?, analyzed_at = ?
        WHERE id = ?
      `
      )
      .run(emotion, JSON.stringify(keywords), summary, analyzedAt, entryId);
    return;
  }

  const store = loadJsonStore();
  const target = store.journal_entries.find((entry) => entry.id === entryId);

  if (!target) {
    return;
  }

  target.emotion = emotion;
  target.keywords = JSON.stringify(keywords);
  target.summary = summary;
  target.analyzed_at = analyzedAt;

  saveJsonStore(store);
}

function getTopEmotion(userId) {
  const rows = getEmotionRows(userId);
  return rows.length > 0 ? rows[0].emotion : null;
}

function getTopAmbience(userId) {
  const rows = getAmbienceRows(userId);
  return rows.length > 0 ? rows[0].ambience : null;
}

function getRecentKeywordRows(userId, limit) {
  if (sqliteDb) {
    return sqliteDb
      .prepare(
        `
        SELECT keywords FROM journal_entries
        WHERE user_id = ? AND keywords IS NOT NULL
        ORDER BY created_at DESC LIMIT ?
      `
      )
      .all(userId, limit);
  }

  const store = loadJsonStore();
  return store.journal_entries
    .filter((entry) => entry.user_id === userId && entry.keywords)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit)
    .map((entry) => ({ keywords: entry.keywords }));
}

function buildCountRows(entries, keyName) {
  const counts = {};

  entries.forEach((entry) => {
    const key = entry[keyName];
    if (!key) {
      return;
    }
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([key, cnt]) => ({ key, cnt }))
    .sort((a, b) => b.cnt - a.cnt);
}

function getEmotionRows(userId) {
  if (sqliteDb) {
    return sqliteDb
      .prepare(
        `
        SELECT emotion, COUNT(*) as cnt FROM journal_entries
        WHERE user_id = ? AND emotion IS NOT NULL
        GROUP BY emotion ORDER BY cnt DESC
      `
      )
      .all(userId);
  }

  const store = loadJsonStore();
  return buildCountRows(
    store.journal_entries.filter((entry) => entry.user_id === userId && entry.emotion),
    "emotion"
  ).map((row) => ({ emotion: row.key, cnt: row.cnt }));
}

function getAmbienceRows(userId) {
  if (sqliteDb) {
    return sqliteDb
      .prepare(
        `
        SELECT ambience, COUNT(*) as cnt FROM journal_entries
        WHERE user_id = ? GROUP BY ambience ORDER BY cnt DESC
      `
      )
      .all(userId);
  }

  const store = loadJsonStore();
  return buildCountRows(
    store.journal_entries.filter((entry) => entry.user_id === userId),
    "ambience"
  ).map((row) => ({ ambience: row.key, cnt: row.cnt }));
}

module.exports = {
  createEntry,
  getEntryById,
  getEntriesByUser,
  countEntriesByUser,
  updateEntryAnalysis,
  getTopEmotion,
  getTopAmbience,
  getRecentKeywordRows,
  getEmotionRows,
  getAmbienceRows,
};
