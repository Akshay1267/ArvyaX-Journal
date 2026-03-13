# 🌿 ArvyaX Journal — AI-Assisted Mental Wellness Journal

An AI-powered journal system for ArvyaX immersive nature sessions.
Users record experiences, get LLM-driven emotion analysis, and track mental wellness trends over time.

---

## Quick Start

### 1. Backend
```bash
cd backend
npm install
# Open .env and add your GROQ_API_KEY (free at console.groq.com)
npm start
```

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm start
```

App opens at **http://localhost:3000**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/journal` | Create journal entry |
| GET | `/api/journal/:userId` | Get all entries |
| POST | `/api/journal/analyze` | Analyze emotion via LLM |
| GET | `/api/journal/insights/:userId` | Get mental state insights |

---

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3) with JSON fallback
- **LLM**: Groq (LLaMA3-8b) — Free tier
- **Frontend**: React
- **Cache**: node-cache (in-memory, TTL 1hr)
- **Rate Limiting**: express-rate-limit
- **Docker**: docker-compose setup included

---

## Environment Variables

Create a `.env` file inside the `backend/` folder:
```
PORT=4000
GROQ_API_KEY=your_groq_api_key_here
FRONTEND_URL=http://localhost:3000
```

Get your free Groq API key at → https://console.groq.com

---

## Project Structure
```
ArvyaX/
├── backend/
│   ├── routes/journal.js     # All API endpoints
│   ├── services/llm.js       # Groq LLM + caching
│   ├── db.js                 # SQLite database
│   ├── server.js             # Express entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main UI
│   │   ├── App.css           # Styling
│   │   └── api.js            # API client
│   └── package.json
├── docker-compose.yml
├── README.md
└── ARCHITECTURE.md
```

---

## Features

- ✅ Journal entry creation with ambience selection
- ✅ Real LLM emotion analysis (emotion, keywords, summary)
- ✅ Mental state insights and trends
- ✅ Analysis caching (no duplicate LLM calls)
- ✅ Rate limiting
- ✅ Docker support
