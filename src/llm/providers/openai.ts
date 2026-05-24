import OpenAI from 'openai';
import type { ILLMClient, LLMCompletionParams, LLMCompletionResult } from '../interface.js';
import { C } from '../../config.js';

interface TokenPricing {
  input: number;
  output: number;
}

/** Pricing per 1M tokens (USD) */
const PRICING: Record<string, TokenPricing> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  if (!pricing) {
    return 0;
  }
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

export class OpenAIClient implements ILLMClient {
  readonly provider = 'openai';
  private readonly client: OpenAI;

  constructor() {
    const apiKey = C.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for the OpenAI provider.');
    }
    this.client = new OpenAI({ apiKey });
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const model = params.model ?? C.DEFAULT_MODEL ?? 'gpt-4o';
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
    const model = params.model ?? C.DEFAULT_MODEL ?? 'gpt-4o';
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
