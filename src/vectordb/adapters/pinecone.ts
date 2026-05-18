import type { IVectorDB, VectorRecord, SimilarityResult } from '../interface.js';

/**
 * Pinecone adapter — placeholder.
 *
 * Mapping of IVectorDB methods to Pinecone equivalents
 * (requires @pinecone-database/pinecone):
 *
 * - upsert()           → index.upsert([{ id, values: embedding, metadata: { text, ...metadata } }])
 * - upsertBatch()      → index.upsert(vectors)  with batching (Pinecone recommends ≤100 vectors per call)
 * - similaritySearch()  → index.query({ vector: embedding, topK, filter: metadataFilter, includeMetadata: true })
 * - deleteByDocument()  → index.deleteMany({ filter: { documentId } })
 * - healthCheck()       → index.describeIndexStats()  (success → true, error → false)
 */

const NOT_IMPLEMENTED_MESSAGE =
  'Pinecone adapter is not yet implemented. Install @pinecone-database/pinecone and implement this adapter.';

export class PineconeAdapter implements IVectorDB {
  async upsert(_record: VectorRecord): Promise<void> {
    // index.upsert([{ id: record.id, values: record.embedding, metadata: { text: record.text, ...record.metadata } }])
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async upsertBatch(_records: VectorRecord[]): Promise<void> {
    // index.upsert(records.map(r => ({ id: r.id, values: r.embedding, metadata: { text: r.text, ...r.metadata } })))
    // Pinecone recommends batching in groups of ≤100 vectors per upsert call.
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async similaritySearch(
    _embedding: number[],
    _topK: number,
    _threshold?: number,
    _metadataFilter?: Record<string, unknown>,
  ): Promise<SimilarityResult[]> {
    // index.query({ vector: embedding, topK, filter: metadataFilter, includeMetadata: true })
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async deleteByDocument(_documentId: string): Promise<void> {
    // index.deleteMany({ filter: { documentId } })
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async healthCheck(): Promise<boolean> {
    // index.describeIndexStats() — success → true, error → false
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }
}
