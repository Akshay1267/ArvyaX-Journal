import { useState, useEffect, useCallback } from "react";
import { api } from "./api";
import "./App.css";

const AMBIENCES = [
  { id: "forest", label: "Forest", emoji: "🌲", color: "#2d6a4f" },
  { id: "ocean", label: "Ocean", emoji: "🌊", color: "#0077b6" },
  { id: "mountain", label: "Mountain", emoji: "⛰️", color: "#6b4226" },
  { id: "desert", label: "Desert", emoji: "🏜️", color: "#c77b2a" },
  { id: "meadow", label: "Meadow", emoji: "🌸", color: "#6a994e" },
  { id: "rain", label: "Rain", emoji: "🌧️", color: "#4361ee" },
  { id: "cave", label: "Cave", emoji: "🌑", color: "#4a4e69" },
];

const EMOTION_COLORS = {
  calm: "#2d6a4f", peaceful: "#40916c", joyful: "#f4a261",
  grateful: "#e76f51", anxious: "#e63946", melancholic: "#6b4226",
  excited: "#ffd166", overwhelmed: "#9d4edd", focused: "#4361ee",
};

const DEFAULT_USER = "user_" + Math.random().toString(36).slice(2, 8);

export default function App() {
  const [userId] = useState(() => localStorage.getItem("arvyax_userId") || DEFAULT_USER);
  const [tab, setTab] = useState("write");
  const [ambience, setAmbience] = useState("forest");
  const [text, setText] = useState("");
  const [entries, setEntries] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [notification, setNotification] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    localStorage.setItem("arvyax_userId", userId);
  }, [userId]);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadEntries = useCallback(async () => {
    try {
      const data = await api.getEntries(userId);
      setEntries(data.entries);
    } catch (e) {
      notify("Failed to load entries", "error");
    }
  }, [userId]);

  const loadInsights = useCallback(async () => {
    try {
      const data = await api.getInsights(userId);
      setInsights(data);
    } catch (e) {
      notify("Failed to load insights", "error");
    }
  }, [userId]);

  useEffect(() => {
    if (tab === "entries") loadEntries();
    if (tab === "insights") loadInsights();
  }, [tab, loadEntries, loadInsights]);

  const handleSubmit = async () => {
    if (text.trim().length < 10) {
      notify("Please write at least 10 characters", "error");
      return;
    }
    setLoading(true);
    try {
      const { entry } = await api.createEntry(userId, ambience, text);
      notify("Entry saved! ✨");
      setText("");
      setEntries((prev) => [entry, ...prev]);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (entry) => {
    setAnalyzing(entry.id);
    setAnalysisResult(null);
    try {
      const result = await api.analyze(entry.text, entry.id);
      setAnalysisResult({ ...result, entryId: entry.id });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, emotion: result.emotion, keywords: result.keywords, summary: result.summary }
            : e
        )
      );
      notify(result.cached ? "Loaded from cache ⚡" : "Analysis complete 🧠");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setAnalyzing(null);
    }
  };

  const selectedAmbience = AMBIENCES.find((a) => a.id === ambience);

  return (
    <div className="app" style={{ "--accent": selectedAmbience?.color || "#2d6a4f" }}>
      {notification && (
        <div className={`notification ${notification.type}`}>{notification.msg}</div>
      )}

      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-logo">🌿</span>
            <div>
              <h1>ArvyaX Journal</h1>
              <p className="user-id">Session: {userId}</p>
            </div>
          </div>
          <nav className="nav">
            {["write", "entries", "insights"].map((t) => (
              <button
                key={t}
                className={`nav-btn ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "write" && "✍️"}{t === "entries" && "📖"}{t === "insights" && "📊"}{" "}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main">
        {/* WRITE TAB */}
        {tab === "write" && (
          <div className="tab-content">
            <div className="section-header">
              <h2>New Entry</h2>
              <p>How was your immersive session today?</p>
            </div>
            <div className="card">
              <label className="field-label">Choose Your Ambience</label>
              <div className="ambience-grid">
                {AMBIENCES.map((a) => (
                  <button
                    key={a.id}
                    className={`ambience-btn ${ambience === a.id ? "selected" : ""}`}
                    style={ambience === a.id ? { "--btn-color": a.color } : {}}
                    onClick={() => setAmbience(a.id)}
                  >
                    <span className="amb-emoji">{a.emoji}</span>
                    <span className="amb-label">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="card">
              <label className="field-label">Journal Entry</label>
              <textarea
                className="journal-textarea"
                placeholder={`Describe your ${selectedAmbience?.label.toLowerCase()} experience...`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                maxLength={5000}
              />
              <div className="char-count">{text.length}/5000</div>
              <button
                className="btn primary"
                onClick={handleSubmit}
                disabled={loading || text.trim().length < 10}
              >
                {loading ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </div>
        )}

        {/* ENTRIES TAB */}
        {tab === "entries" && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Your Journal</h2>
              <p>{entries.length} entries recorded</p>
            </div>
            {entries.length === 0 ? (
              <div className="empty-state">
                <span>📔</span>
                <p>No entries yet. Write your first journal entry!</p>
                <button className="btn primary" onClick={() => setTab("write")}>Write First Entry</button>
              </div>
            ) : (
              <div className="entries-list">
                {entries.map((entry) => {
                  const amb = AMBIENCES.find((a) => a.id === entry.ambience);
                  const isAnalyzing = analyzing === entry.id;
                  const isThisResult = analysisResult?.entryId === entry.id;
                  return (
                    <div className="entry-card" key={entry.id}>
                      <div className="entry-header">
                        <div className="entry-meta">
                          <span className="ambience-badge" style={{ background: amb?.color + "22", color: amb?.color }}>
                            {amb?.emoji} {amb?.label}
                          </span>
                          {entry.emotion && (
                            <span className="emotion-badge" style={{
                              background: (EMOTION_COLORS[entry.emotion] || "#888") + "22",
                              color: EMOTION_COLORS[entry.emotion] || "#888",
                            }}>
                              {entry.emotion}
                            </span>
                          )}
                        </div>
                        <span className="entry-date">
                          {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="entry-text">{entry.text}</p>
                      {entry.summary && (
                        <div className="analysis-box">
                          <p className="analysis-summary">💡 {entry.summary}</p>
                          {entry.keywords && (
                            <div className="keywords">
                              {entry.keywords.map((kw) => (
                                <span key={kw} className="keyword">{kw}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {isThisResult && !entry.summary && (
                        <div className="analysis-box fresh">
                          <p className="analysis-summary">💡 {analysisResult.summary}</p>
                          <div className="keywords">
                            {analysisResult.keywords.map((kw) => (
                              <span key={kw} className="keyword">{kw}</span>
                            ))}
                          </div>
                          {analysisResult.cached && <span className="cached-badge">⚡ Cached</span>}
                        </div>
                      )}
                      {!entry.emotion && (
                        <button className="btn secondary analyze-btn" onClick={() => handleAnalyze(entry)} disabled={isAnalyzing}>
                          {isAnalyzing ? "Analyzing..." : "🧠 Analyze Emotion"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* INSIGHTS TAB */}
        {tab === "insights" && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Your Insights</h2>
              <p>Mental state patterns over time</p>
            </div>
            {!insights || insights.totalEntries === 0 ? (
              <div className="empty-state">
                <span>🔍</span>
                <p>No insights yet. Write and analyze some entries first!</p>
              </div>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{insights.totalEntries}</div>
                    <div className="stat-label">Total Entries</div>
                  </div>
                  <div className="stat-card accent">
                    <div className="stat-value">{insights.topEmotion || "–"}</div>
                    <div className="stat-label">Top Emotion</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{AMBIENCES.find((a) => a.id === insights.mostUsedAmbience)?.emoji || "–"}</div>
                    <div className="stat-label">{insights.mostUsedAmbience || "–"}</div>
                  </div>
                </div>
                {insights.recentKeywords?.length > 0 && (
                  <div className="card">
                    <h3 className="card-title">Recent Keywords</h3>
                    <div className="keywords large">
                      {insights.recentKeywords.map((kw) => (
                        <span key={kw} className="keyword">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {Object.keys(insights.emotionBreakdown || {}).length > 0 && (
                  <div className="card">
                    <h3 className="card-title">Emotion Breakdown</h3>
                    <div className="breakdown">
                      {Object.entries(insights.emotionBreakdown).map(([emotion, count]) => {
                        const max = Math.max(...Object.values(insights.emotionBreakdown));
                        const color = EMOTION_COLORS[emotion] || "#888";
                        return (
                          <div key={emotion} className="breakdown-row">
                            <span className="breakdown-label">{emotion}</span>
                            <div className="breakdown-bar-wrap">
                              <div className="breakdown-bar" style={{ width: `${(count / max) * 100}%`, background: color }} />
                            </div>
                            <span className="breakdown-count">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {Object.keys(insights.ambienceBreakdown || {}).length > 0 && (
                  <div className="card">
                    <h3 className="card-title">Ambience Usage</h3>
                    <div className="ambience-stats">
                      {Object.entries(insights.ambienceBreakdown).map(([amb, count]) => {
                        const a = AMBIENCES.find((x) => x.id === amb);
                        return (
                          <div key={amb} className="ambience-stat-item">
                            <span className="amb-stat-emoji">{a?.emoji}</span>
                            <span className="amb-stat-label">{amb}</span>
                            <span className="amb-stat-count">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
