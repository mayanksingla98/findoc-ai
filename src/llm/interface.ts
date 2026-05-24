export interface LLMCompletionParams {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  cost: number;
  latencyMs: number;
}

export interface ILLMClient {
  readonly provider: string;
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
  stream(params: LLMCompletionParams): AsyncGenerator<string, LLMCompletionResult, unknown>;
}
