# CLAUDE.md — FinDoc AI

## Working principles

Follow these for every task — planning, new features, coding, bug fixes, or docs updates:

1. **Think before coding.** State your assumptions out loud. If the request is ambiguous, ask. If a simpler approach exists, push back. Stop when you are confused — name what is unclear, do not just pick one interpretation and run.
2. **Simplicity first.** Write the minimum code that solves the problem. No speculative abstractions. No flexibility nobody asked for. Test: would a senior engineer call this overcomplicated?
3. **Surgical changes.** Touch only what the task requires. Do not improve neighboring code. Do not refactor what is not broken. Every changed line should trace back to the request.
4. **Goal-driven execution.** Turn vague instructions into verifiable targets before writing a line. "Add validation" becomes "write tests for invalid inputs, then make them pass."
5. **Validate the user's claims — do not be a yes-man.** When the user states a fact, reasoning, or approach, do NOT accept it at face value just because they said it. Cross-check against the actual code, run the logic, and call out anything that looks wrong, incomplete, or unsupported. If the user proposes a solution that is flawed, say so plainly with the specific reason — do not implement it just to be agreeable. Phrases like "you're right" should only appear when you have actually verified the claim. Disagreement, with evidence, is more valuable than agreement.

## What is this project?

FinDoc AI is a production-grade financial document intelligence API. It ingests financial documents (PDFs, bank statements), chunks and embeds them, and provides RAG-based chat, agent reasoning, and structured data extraction over those documents.

## Tech stack

- **Runtime**: Node.js + TypeScript (strict mode, NodeNext modules)
- **Framework**: Fastify v5
- **Database**: PostgreSQL with pgvector
- **Queue**: BullMQ + Redis
- **Validation**: Zod (single source of truth for types + OpenAPI via fastify-type-provider-zod)
- **API docs**: Scalar UI at `/docs` (auto-generated from Zod schemas, never write manual OpenAPI definitions)
- **Observability**: Langfuse (via `langfuse` npm package)
- **LLM**: OpenAI (default), Anthropic, Gemini — abstracted behind `ILLMClient`
- **Embeddings**: OpenAI (default), Cohere — abstracted behind `IEmbeddingClient`
- **Vector DB**: PGVector (default), Qdrant, Pinecone, Milvus — abstracted behind `IVectorDB`

## Core design principle — three abstraction layers

Never call any external SDK directly from business logic. Always go through the interface. Swap any provider by changing a single env variable.

- **LLM**: `src/llm/client.ts` → factory reads `LLM_PROVIDER` env → returns `ILLMClient`
- **Embeddings**: `src/embeddings/client.ts` → factory reads `EMBEDDING_PROVIDER` env → returns `IEmbeddingClient`
- **Vector DB**: `src/vectordb/client.ts` → factory reads `VECTOR_DB` env → returns `IVectorDB`

## Commands

```bash
npm run setup       # One-command bootstrap: install deps + start Docker infra
npm run dev         # Start dev server (tsx watch)
npm run build       # TypeScript compile
npm start           # Run compiled JS
npm run db:migrate  # Run all SQL migrations against DATABASE_URL
npm run db:seed     # Insert sample documents
npm run db:reset    # Drop schema, recreate, re-run migrations
npm run docker:up   # Start infra containers only
npm run docker:down # Stop all containers
npm run docker:up:all # Start everything including app container
npm run lint        # ESLint
npm run format      # Prettier
```

## Architecture rules

- All LLM calls go through `src/llm/client.ts` — never import openai/anthropic SDK directly in business logic
- All embedding calls go through `src/embeddings/client.ts`
- All vector operations go through `src/vectordb/client.ts`
- All Langfuse logging goes through `src/llmops/logger.ts` — provider implementations call `logLLMCall()` internally
- Every API route uses Zod schemas for request/response — these auto-generate the OpenAPI spec
- Validate env vars at startup in `src/api/index.ts` — fail fast with clear error messages
- Use Fastify's built-in pino logger — no `console.log` in production code (except llmops fallback logging)

## TypeScript conventions

- Strict mode — no `any` types
- Use `.js` extensions in all import paths (NodeNext module resolution)
- Use bracket notation for `process.env` access: `process.env['VAR_NAME']` (required by `noPropertyAccessFromIndexSignature`)
- Handle `undefined` from indexed access (required by `noUncheckedIndexedAccess`)

## Project structure

```
src/
  llm/          # LLM abstraction (interface, factory, providers/)
  embeddings/   # Embedding abstraction (interface, factory, providers/)
  vectordb/     # Vector DB abstraction (interface, factory, adapters/)
  llmops/       # Langfuse logger, model router, guardrails
  rag/          # RAG pipeline (placeholder)
  retrieval/    # Retrieval strategies (placeholder)
  agent/        # LangGraph agent (placeholder)
  bank/         # Bank statement processing (placeholder)
  api/          # Fastify app, plugins/, routes/
db/migrations/  # SQL migrations (run on docker-compose up)
evals/          # Evaluation golden sets
```

## Adding a new API route

1. Create `src/api/routes/yourroute.ts`
2. Define Zod schemas for request body and response
3. Use `app.withTypeProvider<ZodTypeProvider>()` and pass schemas in `{ schema: { body, response } }`
4. Register in `src/api/index.ts`
5. Docs appear automatically at `/docs`

## Adding a new LLM/embedding/vector DB provider

1. Create the provider file in the appropriate `providers/` or `adapters/` directory
2. Implement the interface (`ILLMClient`, `IEmbeddingClient`, or `IVectorDB`)
3. Add the case to the factory's switch statement in `client.ts`
4. LLM providers must call `logLLMCall()` from `src/llmops/logger.ts` before returning

## Infrastructure

Three ways to run — see README for full details:
- **Option A**: Docker for infra + local app (`npm run setup && npm run dev`)
- **Option B**: Full Docker (`docker-compose --profile app up -d`)
- **Option C**: Fully local via Homebrew (`brew install postgresql pgvector redis`)

Docker services (Options A/B):
- PostgreSQL (pgvector): `localhost:5432` (user: postgres, pass: postgres, db: findoc)
- Redis: `localhost:6379`
- Qdrant: `localhost:6333`
- Adminer: `localhost:8080`
- Migrations auto-run on first postgres start via docker-entrypoint-initdb.d

For Option C, run `npm run db:migrate` after creating the database.
