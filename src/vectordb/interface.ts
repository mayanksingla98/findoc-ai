export interface VectorRecord {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface SimilarityResult {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface IVectorDB {
  upsert(record: VectorRecord): Promise<void>;
  upsertBatch(records: VectorRecord[]): Promise<void>;
  similaritySearch(
    embedding: number[],
    topK: number,
    threshold?: number,
    metadataFilter?: Record<string, unknown>
  ): Promise<SimilarityResult[]>;
  deleteByDocument(documentId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
