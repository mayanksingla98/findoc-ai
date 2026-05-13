# FinDoc AI — Architecture Guide

A technical walkthrough of how the system works, end to end.

---

## System Overview

```mermaid
graph TB
    Client["Client"]
    API["Fastify API"]
    Router["Model Router"]
    
    Client --> API
    API --> Router
```

```mermaid
graph TB
    Client["Client (curl / UI)"]
    API["Fastify API<br/>Zod validation + Scalar docs"]
    Router["Model Router<br/>cheap vs expensive"]
    LLM["LLM Layer"]
    EMB["Embeddings Layer"]
    VDB["VectorDB Layer"]
    Logger["Langfuse Logger"]

    OpenAI_LLM["OpenAI"]
    Anthropic_LLM["Anthropic"]
    Gemini_LLM["Gemini"]

    OpenAI_EMB["OpenAI Embeddings"]
    Cohere_EMB["Cohere"]

    PGVector["PGVector"]
    Qdrant["Qdrant"]
    Pinecone["Pinecone"]
    Milvus["Milvus"]

    PG[("PostgreSQL")]
    Redis[("Redis")]

    Client -->|HTTP| API
    API --> Router
    Router --> LLM
    LLM --> OpenAI_LLM
    LLM --> Anthropic_LLM
    LLM --> Gemini_LLM
    LLM --> Logger

    API --> EMB
    EMB --> OpenAI_EMB
    EMB --> Cohere_EMB

    API --> VDB
    VDB --> PGVector
    VDB --> Qdrant
    VDB --> Pinecone
    VDB --> Milvus

    PGVector --> PG
    API --> Redis

    style LLM fill:#e0f0ff,stroke:#3b82f6
    style EMB fill:#e0ffe0,stroke:#22c55e
    style VDB fill:#fff0e0,stroke:#f59e0b
    style Logger fill:#f0e0ff,stroke:#a855f7
```

> Every external SDK is behind an interface. Business logic never imports `openai` or `@anthropic-ai/sdk` directly.

---

## Request Flow — POST /chat

What happens when a client sends a message:

```mermaid
sequenceDiagram
    participant C as Client
    participant F as Fastify
    participant Z as Zod
    participant R as Model Router
    participant L as LLM Factory
    participant P as Provider (OpenAI/Anthropic)
    participant LF as Langfuse

    C->>F: POST /chat { message, stream? }
    F->>Z: Validate request body
    Z-->>F: Parsed { message, stream }

    F->>R: routeModel(message, "general")
    R-->>F: { model: "gpt-4o-mini", reason: "short query" }

    alt stream = false
        F->>L: createLLMClient()
        L-->>F: ILLMClient instance
        F->>P: complete({ prompt, model })
        P-->>P: Call SDK, measure latency, calc cost
        P->>LF: logLLMCall({ tokens, cost, latency })
        P-->>F: { text, model, cost, latencyMs }
        F-->>C: JSON response
    else stream = true
        F->>L: createLLMClient()
        L-->>F: ILLMClient instance
        F->>P: stream({ prompt, model })
        loop For each chunk
            P-->>F: yield text chunk
            F-->>C: write chunk to response
        end
        P->>LF: logLLMCall({ accumulated response })
        F-->>C: end stream
    end
```

---

## Provider Factory Pattern

All three abstraction layers use the same pattern. One env var swap changes the entire provider — zero code changes.

```mermaid
flowchart LR
    ENV["ENV VAR<br/>e.g. LLM_PROVIDER=openai"]
    Factory["Factory<br/>createLLMClient()"]
    Interface["ILLMClient interface"]

    OAI["OpenAIClient"]
    ANT["AnthropicClient"]
    GEM["GeminiClient"]

    ENV --> Factory
    Factory -->|"openai"| OAI
    Factory -->|"anthropic"| ANT
    Factory -->|"gemini"| GEM

    OAI -.->|implements| Interface
    ANT -.->|implements| Interface
    GEM -.->|implements| Interface

    style Interface fill:#f9f9f9,stroke:#666,stroke-dasharray: 5 5
```

```
┌──────────────────────────────────────────────────────┐
│ Same pattern for all three layers:                   │
│                                                      │
│  LLM_PROVIDER       → createLLMClient()    → ILLMClient       │
│  EMBEDDING_PROVIDER  → createEmbeddingClient() → IEmbeddingClient │
│  VECTOR_DB           → createVectorDB()    → IVectorDB        │
└──────────────────────────────────────────────────────┘
```

---

## Model Routing

The router decides cheap vs expensive model **before** the LLM call. This controls cost automatically.

```mermaid
flowchart TD
    Q["Incoming query"]
    CT{"Context type?"}
    WC{"Word count?"}

    CHEAP["Cheap model<br/>gpt-4o-mini<br/>(CHEAP_MODEL env)"]
    EXPENSIVE["Expensive model<br/>gpt-4o<br/>(DEFAULT_MODEL env)"]

    Q --> CT
    CT -->|classification<br/>simple_lookup| CHEAP
    CT -->|rag_generation<br/>agent_reasoning<br/>extraction| EXPENSIVE
    CT -->|general| WC
    WC -->|"< 20 words"| CHEAP
    WC -->|">= 20 words"| EXPENSIVE

    style CHEAP fill:#d4edda,stroke:#28a745
    style EXPENSIVE fill:#fff3cd,stroke:#ffc107
```

---

## LLM Call Lifecycle

Every LLM call — regardless of provider — follows this exact path:

```mermaid
flowchart TD
    A["Business logic calls<br/>llm.complete() or llm.stream()"]
    B["Provider reads model param<br/>(or uses default from env)"]
    C["Start timer: Date.now()"]
    D["Call SDK<br/>(OpenAI / Anthropic / etc.)"]
    E["Stop timer, calculate latency"]
    F["Look up pricing table<br/>Calculate cost from tokens"]
    G["logLLMCall() → Langfuse"]
    H{"Langfuse available?"}
    I["Create trace + generation span"]
    J["Log to console as fallback"]
    K["Return result to caller"]

    A --> B --> C --> D --> E --> F --> G --> H
    H -->|yes| I --> K
    H -->|no| J --> K

    style G fill:#f0e0ff,stroke:#a855f7
    style J fill:#fff3cd,stroke:#ffc107
```

> Key: the app **never crashes** if Langfuse is down. Observability is best-effort.

---

## Database Schema

```mermaid
erDiagram
    DOCUMENTS {
        uuid id PK
        varchar filename
        varchar source
        varchar status "pending | processing | ready | failed"
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }

    CHUNKS {
        uuid id PK
        uuid document_id FK
        text text
        vector embedding "vector(1536)"
        jsonb metadata
        tsvector tsv "for full-text search"
        timestamptz created_at
    }

    DOCUMENTS ||--o{ CHUNKS : "has many"
```

**Indexes:**
- `HNSW` on `chunks.embedding` — fast approximate nearest neighbor search
- `GIN` on `chunks.tsv` — full-text search (BM25-style)
- `B-tree` on `chunks.document_id` — document lookups

---

## Planned: RAG Pipeline

How document ingestion and query answering will work:

```mermaid
flowchart TD
    subgraph Ingestion["Document Ingestion (async via BullMQ)"]
        U["PDF upload"] --> EX["Extract text"]
        EX --> CH["Chunk text<br/>(recursive splitting)"]
        CH --> EM["Generate embeddings<br/>via Embeddings Layer"]
        EM --> ST["Store in VectorDB<br/>+ compute tsvector"]
    end

    subgraph Query["Query Pipeline"]
        QU["User question"] --> QE["Generate query embedding"]
        QE --> VS["Vector similarity search"]
        QE --> FS["Full-text search (BM25)"]
        VS --> RRF["Reciprocal Rank Fusion<br/>(merge results)"]
        FS --> RRF
        RRF --> CTX["Build prompt with<br/>retrieved context"]
        CTX --> LLM["LLM generates answer<br/>with citations"]
        LLM --> RES["Return grounded response"]
    end

    style Ingestion fill:#f0f8ff,stroke:#3b82f6
    style Query fill:#f0fff0,stroke:#22c55e
```

---

## Planned: Agent Architecture

```mermaid
flowchart TD
    Q["User query"] --> ROUTE{"Simple or complex?"}
    ROUTE -->|simple| RAG["RAG Pipeline"]
    ROUTE -->|complex| AGENT["LangGraph Agent"]

    AGENT --> REASON["Reason: pick a tool"]
    REASON --> TOOLS{"Which tool?"}
    TOOLS -->|search| T1["searchDocuments"]
    TOOLS -->|extract| T2["extractTable"]
    TOOLS -->|calculate| T3["calculateMetric"]
    TOOLS -->|compare| T4["compareDocuments"]

    T1 --> REASON
    T2 --> REASON
    T3 --> REASON
    T4 --> REASON

    REASON -->|done| RESPOND["Generate final response"]
    RAG --> RESPOND

    style AGENT fill:#fff0f0,stroke:#ef4444
```

---

## File Map — Where Things Live

```
src/
├── api/
│   ├── index.ts              ← Entry point. Env validation, plugin + route registration
│   ├── plugins/cors.ts       ← CORS config
│   ├── plugins/helmet.ts     ← Security headers
│   └── routes/chat.ts        ← POST /chat (Zod schemas → auto OpenAPI docs)
│
├── llm/
│   ├── interface.ts          ← ILLMClient (complete + stream)
│   ├── client.ts             ← Factory: reads LLM_PROVIDER → returns provider
│   └── providers/            ← openai.ts, anthropic.ts, gemini.ts
│
├── embeddings/
│   ├── interface.ts          ← IEmbeddingClient (generate + generateBatch)
│   ├── client.ts             ← Factory: reads EMBEDDING_PROVIDER → returns provider
│   └── providers/            ← openai.ts, cohere.ts
│
├── vectordb/
│   ├── interface.ts          ← IVectorDB (upsert, search, delete, health)
│   ├── client.ts             ← Factory: reads VECTOR_DB → returns adapter
│   └── adapters/             ← pgvector.ts, qdrant.ts, pinecone.ts, milvus.ts
│
├── llmops/
│   ├── logger.ts             ← Langfuse wrapper (called inside every LLM provider)
│   ├── router.ts             ← Cheap vs expensive model routing
│   └── guardrails.ts         ← Placeholder: input/output validation
│
├── rag/index.ts              ← Placeholder: RAG pipeline
├── retrieval/index.ts        ← Placeholder: retrieval strategies
├── agent/index.ts            ← Placeholder: LangGraph agent
└── bank/index.ts             ← Placeholder: bank statement processing

db/migrations/                ← SQL files (auto-run by Docker on first start)
```
