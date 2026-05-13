import type { IEmbeddingClient } from './interface.js';
import { OpenAIEmbeddingClient } from './providers/openai.js';
import { CohereEmbeddingClient } from './providers/cohere.js';

export function createEmbeddingClient(): IEmbeddingClient {
  const provider = process.env['EMBEDDING_PROVIDER'];

  if (!provider) {
    throw new Error(
      'Missing EMBEDDING_PROVIDER environment variable. Set it to one of: openai, cohere',
    );
  }

  switch (provider) {
    case 'openai':
      return new OpenAIEmbeddingClient();
    case 'cohere':
      return new CohereEmbeddingClient();
    default:
      throw new Error(
        `Unsupported EMBEDDING_PROVIDER "${provider}". Supported values: openai, cohere`,
      );
  }
}
