// Load .env when available, but do not crash if dotenv is not installed.
try {
  require("dotenv").config();
} catch (err) {
  console.warn("dotenv not found, using existing process environment variables.");
}
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const db = require("./db");
const journalRoutes = require("./routes/journal");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again later." },
});
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Analysis rate limit reached. Wait a moment." },
});

app.use("/api", limiter);
app.use("/api/journal/analyze", analyzeLimiter);

// Routes
app.use("/api/journal", journalRoutes);

// Health check
app.get("/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

app.listen(PORT, () => {
  console.log(`🌿 ArvyaX Journal API running on http://localhost:${PORT}`);
});
