import type { IVectorDB, VectorRecord, SimilarityResult } from '../interface.js';

/**
 * Qdrant adapter — placeholder.
 *
 * Mapping of IVectorDB methods to Qdrant equivalents
 * (requires @qdrant/js-client-rest):
 *
 * - upsert()           → qdrant.upsert(collectionName, { points: [{ id, vector, payload }] })
 * - upsertBatch()      → qdrant.upsert(collectionName, { points: [{ id, vector, payload }, ...] })
 * - similaritySearch()  → qdrant.search(collectionName, { vector, limit, score_threshold, filter })
 * - deleteByDocument()  → qdrant.delete(collectionName, { filter: { must: [{ key: "documentId", match: { value } }] } })
 * - healthCheck()       → qdrant.getCollections()  (success → true, error → false)
 */

const NOT_IMPLEMENTED_MESSAGE =
  'Qdrant adapter is not yet implemented. Install @qdrant/js-client-rest and implement this adapter.';

export class QdrantAdapter implements IVectorDB {
  async upsert(_record: VectorRecord): Promise<void> {
    // qdrant.upsert(collectionName, { points: [{ id, vector: record.embedding, payload: { text, ...metadata } }] })
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async upsertBatch(_records: VectorRecord[]): Promise<void> {
    // qdrant.upsert(collectionName, { points: records.map(r => ({ id: r.id, vector: r.embedding, payload: { text: r.text, ...r.metadata } })) })
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async similaritySearch(
    _embedding: number[],
    _topK: number,
    _threshold?: number,
    _metadataFilter?: Record<string, unknown>,
  ): Promise<SimilarityResult[]> {
    // qdrant.search(collectionName, { vector: embedding, limit: topK, score_threshold: threshold, filter: metadataFilter })
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async deleteByDocument(_documentId: string): Promise<void> {
    // qdrant.delete(collectionName, { filter: { must: [{ key: "documentId", match: { value: documentId } }] } })
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async healthCheck(): Promise<boolean> {
    // qdrant.getCollections() — success → true, error → false
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }
}
