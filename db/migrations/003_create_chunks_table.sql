CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  tsv TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);
-- GIN index for full-text search
CREATE INDEX idx_chunks_tsv ON chunks USING gin(tsv);
-- Index for document lookups
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
