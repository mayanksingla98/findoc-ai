export interface IEmbeddingClient {
  generate(text: string): Promise<number[]>;
  generateBatch(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
}
