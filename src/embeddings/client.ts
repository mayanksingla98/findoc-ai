import type { IEmbeddingClient } from './interface.js';
import { C } from '../config.js';
import { OpenAIEmbeddingClient } from './providers/openai.js';
import { CohereEmbeddingClient } from './providers/cohere.js';

export function createEmbeddingClient(): IEmbeddingClient {
  switch (C.EMBEDDING_PROVIDER) {
    case 'openai':
      return new OpenAIEmbeddingClient();
    case 'cohere':
      return new CohereEmbeddingClient();
  }
}
