import OpenAI from 'openai';
import type { IEmbeddingClient } from '../interface.js';

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100;

export class OpenAIEmbeddingClient implements IEmbeddingClient {
  readonly dimensions: number = DEFAULT_DIMENSIONS;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({ apiKey });
    this.model = process.env['EMBEDDING_MODEL'] ?? DEFAULT_MODEL;
  }

  async generate(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('OpenAI returned no embedding for the provided text.');
    }

    return embedding;
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const chunk = texts.slice(i, i + MAX_BATCH_SIZE);

      const response = await this.client.embeddings.create({
        model: this.model,
        input: chunk,
      });

      const sorted = response.data.sort((a, b) => a.index - b.index);

      for (const item of sorted) {
        results.push(item.embedding);
      }
    }

    return results;
  }
}
