# 🌿 ArvyaX Journal — AI-Assisted Mental Wellness Journal

## Quick Start

### 1. Backend
```bash
cd backend
npm install
# Open .env and add your ANTHROPIC_API_KEY
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

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **LLM**: Anthropic Claude Haiku
- **Frontend**: React
- **Cache**: node-cache (in-memory, TTL 1hr)
- **Rate Limiting**: express-rate-limit
