import type {
  IVectorDB,
  VectorRecord,
  SimilarityResult,
} from "../interface.js";

/**
 * Milvus adapter — placeholder.
 *
 * Requires @zilliz/milvus2-sdk-node to implement.
 */

const NOT_IMPLEMENTED_MESSAGE =
  "Milvus adapter is not yet implemented. Install @zilliz/milvus2-sdk-node and implement this adapter.";

export class MilvusAdapter implements IVectorDB {
  async upsert(_record: VectorRecord): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async upsertBatch(_records: VectorRecord[]): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async similaritySearch(
    _embedding: number[],
    _topK: number,
    _threshold?: number,
    _metadataFilter?: Record<string, unknown>
  ): Promise<SimilarityResult[]> {
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async deleteByDocument(_documentId: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }

  async healthCheck(): Promise<boolean> {
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }
}
