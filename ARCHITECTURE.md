# Architecture — ArvyaX Journal

## System Diagram

```
React SPA (3000) ──► Express API (4000) ──► SQLite DB
                              │
                              ├──► node-cache (analysis cache)
                              └──► Anthropic Claude API (LLM)
```

## Q1: How would you scale to 100k users?

- **Database**: Migrate SQLite → PostgreSQL with read replicas. Partition `journal_entries` by `user_id`.
- **API**: Run multiple Express instances behind a load balancer (nginx/AWS ALB). Use PM2 cluster mode or Kubernetes HPA.
- **Async LLM**: Move analysis to a background job queue (BullMQ + Redis) — don't block HTTP response on LLM latency.
- **Cache**: Replace in-process node-cache with Redis so all API instances share one cache.
- **Frontend**: Serve via CDN (Cloudflare/CloudFront) — React build is pure static.

## Q2: How would you reduce LLM cost?

- **Use Claude Haiku** (already done) — cheapest Anthropic model at $0.25/1M input tokens.
- **Cache aggressively** — SHA-256 hash of text as cache key; identical entries never hit the API twice.
- **Batch analysis** — combine multiple entries in one prompt to reduce per-entry token overhead.
- **Semantic deduplication** — use embeddings + cosine similarity to skip LLM when new text is >95% similar to a cached entry.
- **Self-hosted model** — for fixed emotion taxonomy, fine-tune a small open-source model (Phi-3-mini via Ollama). Near-zero per-request cost after setup.

## Q3: How would you cache repeated analysis?

**Current**: `node-cache` in process memory.
- Key: `sha256(normalizedText).slice(0,16)` — hashed, not raw text (privacy)
- TTL: 1 hour
- Returns `cached: true` flag to frontend

**Production upgrade** → Redis:
```js
const key = `analysis:${sha256(text)}`;
const hit = await redis.get(key);
if (hit) return { ...JSON.parse(hit), cached: true };
const result = await callLLM(text);
await redis.setex(key, 86400, JSON.stringify(result));
```
Redis advantages: shared across all instances, survives restarts, LRU eviction.

## Q4: How would you protect sensitive journal data?

- **Transport**: HTTPS/TLS everywhere, HSTS headers.
- **Auth**: JWT middleware — users can only query their own `user_id` (enforced server-side).
- **Encryption at rest**: AES-256 disk encryption on managed DB. Field-level encryption for `text` column using keys stored in AWS KMS.
- **LLM privacy**: Review Anthropic DPA. Optionally strip PII before sending text, or switch to self-hosted LLM to keep data on-premises.
- **Infrastructure**: DB in private VPC subnet. API keys in secrets manager, never in plaintext env vars in production.
- **Audit logs**: Log all access with timestamps but never log entry content.

## Data Model

```sql
journal_entries (
  id          TEXT PRIMARY KEY,   -- UUID
  user_id     TEXT NOT NULL,      -- User identifier
  ambience    TEXT NOT NULL,      -- forest | ocean | mountain | ...
  text        TEXT NOT NULL,      -- Journal body
  emotion     TEXT,               -- Populated after LLM analysis
  keywords    TEXT,               -- JSON array string
  summary     TEXT,               -- LLM mental state summary
  analyzed_at TEXT,               -- ISO timestamp
  created_at  TEXT NOT NULL       -- ISO timestamp
)
```
