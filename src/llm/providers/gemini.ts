import type { ILLMClient, LLMCompletionParams, LLMCompletionResult } from '../interface.js';

export class GeminiClient implements ILLMClient {
  complete(_params: LLMCompletionParams): Promise<LLMCompletionResult> {
    throw new Error(
      'Gemini provider is not yet implemented. Install @google/generative-ai and implement this adapter.',
    );
  }

  async *stream(_params: LLMCompletionParams): AsyncGenerator<string, void, unknown> {
    throw new Error(
      'Gemini provider is not yet implemented. Install @google/generative-ai and implement this adapter.',
    );
  }
}
