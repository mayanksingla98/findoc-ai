import type { ILLMClient } from './interface.js';
import { OpenAIClient } from './providers/openai.js';
import { AnthropicClient } from './providers/anthropic.js';
import { GeminiClient } from './providers/gemini.js';

const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'gemini'] as const;
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

function isSupportedProvider(value: string): value is SupportedProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(value);
}

export function createLLMClient(): ILLMClient {
  const provider = process.env['LLM_PROVIDER'];

  if (!provider) {
    throw new Error(
      'LLM_PROVIDER environment variable is required. ' +
        `Supported values: ${SUPPORTED_PROVIDERS.join(', ')}`,
    );
  }

  if (!isSupportedProvider(provider)) {
    throw new Error(
      `Unsupported LLM_PROVIDER "${provider}". ` +
        `Supported values: ${SUPPORTED_PROVIDERS.join(', ')}`,
    );
  }

  switch (provider) {
    case 'openai':
      return new OpenAIClient();
    case 'anthropic':
      return new AnthropicClient();
    case 'gemini':
      return new GeminiClient();
  }
}
