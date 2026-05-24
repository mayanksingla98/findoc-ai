import OpenAI from 'openai';
import type { ILLMClient, LLMCompletionParams, LLMCompletionResult } from '../interface.js';
import { C } from '../../config.js';

interface TokenPricing {
  input: number;
  output: number;
}

/** Pricing per 1M tokens (USD) — https://x.ai/api */
const PRICING: Record<string, TokenPricing> = {
  'grok-3': { input: 3.0, output: 15.0 },
  'grok-3-fast': { input: 5.0, output: 25.0 },
  'grok-3-mini': { input: 0.3, output: 0.5 },
  'grok-3-mini-fast': { input: 0.6, output: 4.0 },
  'grok-2-1212': { input: 2.0, output: 10.0 },
};

const DEFAULT_MODEL = 'grok-3-mini';

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

export class GrokClient implements ILLMClient {
  readonly provider = 'grok';
  private readonly client: OpenAI;

  constructor() {
    const apiKey = C.XAI_API_KEY;
    if (!apiKey) {
      throw new Error('XAI_API_KEY environment variable is required for the Grok provider.');
    }
    // xAI is OpenAI-compatible — just swap the base URL
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const model = params.model ?? C.DEFAULT_MODEL ?? DEFAULT_MODEL;
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    const latencyMs = Date.now() - start;

    const choice = response.choices[0];
    const text = choice?.message.content ?? '';
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const cost = calculateCost(model, inputTokens, outputTokens);

    return { text, inputTokens, outputTokens, model, cost, latencyMs };
  }

  async *stream(
    params: LLMCompletionParams,
  ): AsyncGenerator<string, LLMCompletionResult, unknown> {
    const model = params.model ?? C.DEFAULT_MODEL ?? DEFAULT_MODEL;
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const start = Date.now();
    let fullResponse = '';

    const stream = await this.client.chat.completions.create({
      model,
      messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      stream: true,
      ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta.content;
      if (delta) {
        fullResponse += delta;
        yield delta;
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }
    }

    const latencyMs = Date.now() - start;
    const cost = calculateCost(model, inputTokens, outputTokens);

    return { text: fullResponse, inputTokens, outputTokens, model, cost, latencyMs };
  }
}
