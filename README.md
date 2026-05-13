# FinDoc AI

A production-grade financial document intelligence API built with Node.js, TypeScript, Fastify, PGVector, and LangGraph.

Upload any financial document -- bank statements, annual reports, invoices -- and get accurate, grounded answers via a hybrid RAG pipeline. Ask complex questions through an agent that routes across multiple tools. Parse bank statements into structured, categorised transactions with anomaly detection and explainable flags.

Built to demonstrate what separates a real AI engineering system from a ChatGPT wrapper -- cost control, observability, structured output reliability, PII compliance and production failure handling.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript (strict mode) |
| Framework | Fastify v5 |
| LLM | OpenAI (default), Anthropic, Gemini -- swappable via env var |
| Embeddings | OpenAI (default), Cohere -- swappable via env var |
| Vector DB | PGVector (default), Qdrant, Pinecone, Milvus -- swappable via env var |
| Database | PostgreSQL with pgvector |
| Queue | BullMQ + Redis |
| Observability | Langfuse |
| Validation | Zod |
| API Docs | Scalar (auto-generated from Zod schemas) |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://www.docker.com/) and Docker Compose (for Options A/B) **or** Homebrew (for Option C)
- An OpenAI API key (or Anthropic, depending on your provider choice)

## Getting Started

### 1. Clone and configure

```bash
git clone https://github.com/your-username/findoc-ai.git
cd findoc-ai
cp .env.example .env
```

Open `.env` and fill in at minimum:

```
OPENAI_API_KEY=sk-...
```

The defaults (`LLM_PROVIDER=openai`, `EMBEDDING_PROVIDER=openai`, `VECTOR_DB=pgvector`) work out of the box.

### 2. Choose how to run

#### Option A: Local development (recommended for dev)

Run infrastructure in Docker, app on your machine with hot reload.

```bash
# One-command setup: install deps + start Postgres, Redis, Qdrant, Adminer
npm run setup

# (Optional) Run migrations manually if DB already existed
npm run db:migrate

# (Optional) Seed sample documents
npm run db:seed

# Start dev server
npm run dev
```

#### Option B: Full Docker (everything in containers)

Run the entire stack in Docker, including the app.

```bash
docker-compose --profile app up -d
```

The app container mounts `src/` so code changes are picked up automatically.

#### Option C: Fully local (no Docker)

Run everything natively on your machine.

**Install Postgres with pgvector:**

```bash
brew install postgresql@17
brew services start postgresql@17

# Install pgvector extension
brew install pgvector

# Create the database
createdb findoc
```

**Install Redis:**

```bash
brew install redis
brew services start redis
```

**Update `.env` for local Postgres** (Homebrew uses your system user with no password by default):

```env
DATABASE_URL=postgresql://localhost:5432/findoc
```

**Install deps, run migrations, seed, and start:**

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

> Qdrant and Adminer are optional -- skip them for local dev unless you need them. Install Qdrant locally with `brew install qdrant/tap/qdrant` if needed.

---

Options A and B start these infrastructure services via Docker:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL (pgvector) | 5432 | Database + vector store |
| Redis | 6379 | BullMQ job queue |
| Qdrant | 6333 | Alternative vector DB (optional) |
| Adminer | 8080 | Database UI |

Database migrations run automatically on first Postgres start (Docker), or via `npm run db:migrate` (Option C).

### 3. Open the API docs

Visit **http://localhost:3000/docs** for the interactive Scalar API reference.

## Usage

### Chat (non-streaming)

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is a balance sheet?"}'
```

Response:

```json
{
  "text": "A balance sheet is a financial statement that...",
  "model": "gpt-4o-mini",
  "cost": 0.000045,
  "latencyMs": 823
}
```

### Chat (streaming)

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain the difference between revenue and profit", "stream": true}' \
  --no-buffer
```

Tokens stream back as `text/plain` chunks in real time.

### Health check

```bash
curl http://localhost:3000/health
```

## Switching Providers

Change a single env var -- no code changes required.

### Use Anthropic instead of OpenAI

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### Use Qdrant instead of PGVector

```env
VECTOR_DB=qdrant
QDRANT_URL=http://localhost:6333
```

> Qdrant, Pinecone, Milvus, Cohere, and Gemini adapters are placeholders. They throw a descriptive not-implemented error pointing you to the package to install.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | One-command setup: install deps, start Docker infra |
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run db:migrate` | Run all SQL migrations against `DATABASE_URL` |
| `npm run db:seed` | Insert sample documents into the database |
| `npm run db:reset` | Drop and recreate schema, then run migrations |
| `npm run docker:up` | Start infrastructure containers (Postgres, Redis, etc.) |
| `npm run docker:down` | Stop all containers |
| `npm run docker:up:all` | Start everything including the app container |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

## Project Structure

```
src/
  llm/              # LLM abstraction layer (interface, factory, providers)
  embeddings/       # Embedding abstraction layer (interface, factory, providers)
  vectordb/         # Vector DB abstraction layer (interface, factory, adapters)
  llmops/           # Langfuse logger, model router, guardrails
  rag/              # RAG pipeline (coming soon)
  retrieval/        # Retrieval strategies (coming soon)
  agent/            # LangGraph agent (coming soon)
  bank/             # Bank statement processing (coming soon)
  api/              # Fastify app, plugins, routes
db/migrations/      # SQL migrations (auto-run by Docker)
evals/              # Evaluation golden sets
```

## Architecture

Three abstraction layers ensure no external SDK is ever called directly from business logic:

```
Business Logic (routes, RAG, agent)
        |
   Factory Layer (reads env var, returns provider)
        |
   Provider Layer (implements interface, calls SDK)
```

- `createLLMClient()` reads `LLM_PROVIDER` -> returns `ILLMClient`
- `createEmbeddingClient()` reads `EMBEDDING_PROVIDER` -> returns `IEmbeddingClient`
- `createVectorDB()` reads `VECTOR_DB` -> returns `IVectorDB`

## Observability

Every LLM call is automatically logged to [Langfuse](https://langfuse.com) with:
- Provider and model
- Input/output token counts
- Cost in USD
- Latency in ms

Set `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` in your `.env` to enable. If Langfuse is unreachable, calls are logged to the console instead -- the app never crashes due to observability failures.

## License

[MIT](LICENSE)
