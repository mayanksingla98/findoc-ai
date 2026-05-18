import type { IEmbeddingClient } from '../interface.js';

const COHERE_EMBED_V3_DIMENSIONS = 1024;

export class CohereEmbeddingClient implements IEmbeddingClient {
  readonly dimensions: number = COHERE_EMBED_V3_DIMENSIONS;

  generate(_text: string): Promise<number[]> {
    throw new Error('Cohere embedding provider is not yet implemented. Install cohere-ai and implement this adapter.');
  }

  generateBatch(_texts: string[]): Promise<number[][]> {
    throw new Error('Cohere embedding provider is not yet implemented. Install cohere-ai and implement this adapter.');
  }
}
