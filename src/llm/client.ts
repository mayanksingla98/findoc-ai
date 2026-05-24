import type { ILLMClient } from './interface.js';
import { C } from '../config.js';
import { OpenAIClient } from './providers/openai.js';
import { AnthropicClient } from './providers/anthropic.js';
import { GeminiClient } from './providers/gemini.js';
import { GrokClient } from './providers/grok.js';
import { ObservableLLMClient } from '../llmops/observable-llm.js';

function instantiate(): ILLMClient {
  switch (C.LLM_PROVIDER) {
    case 'openai':
      return new OpenAIClient();
    case 'anthropic':
      return new AnthropicClient();
    case 'gemini':
      return new GeminiClient();
    case 'grok':
      return new GrokClient();
  }
}

export function createLLMClient(): ObservableLLMClient {
  return new ObservableLLMClient(instantiate());
}
