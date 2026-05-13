import Anthropic from '@anthropic-ai/sdk';
import type { ILLMClient, LLMCompletionParams, LLMCompletionResult } from '../interface.js';
import { logLLMCall } from '../../llmops/logger.js';

interface TokenPricing {
  input: number;
  output: number;
}

/** Pricing per 1M tokens (USD) */
const PRICING: Record<string, TokenPricing> = {
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
};

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  if (!pricing) {
    return 0;
  }
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

export class AnthropicClient implements ILLMClient {
  private readonly client: Anthropic;

  constructor() {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required for the Anthropic provider.',
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const model = params.model ?? DEFAULT_MODEL;

    const start = Date.now();

    const response = await this.client.messages.create({
      model,
      max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(params.systemPrompt ? { system: params.systemPrompt } : {}),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: params.prompt }],
        },
      ],
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
    });

    const latencyMs = Date.now() - start;

    const textBlock = response.content.find((block) => block.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = calculateCost(model, inputTokens, outputTokens);

    logLLMCall({
      provider: 'anthropic',
      model,
      inputTokens,
      outputTokens,
      cost,
      latencyMs,
      prompt: params.prompt,
      response: text,
    });

    return { text, inputTokens, outputTokens, model, cost, latencyMs };
  }

  async *stream(params: LLMCompletionParams): AsyncGenerator<string, void, unknown> {
    const model = params.model ?? DEFAULT_MODEL;

    const start = Date.now();
    let fullResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = this.client.messages.stream({
      model,
      max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(params.systemPrompt ? { system: params.systemPrompt } : {}),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: params.prompt }],
        },
      ],
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const delta = event.delta.text;
        fullResponse += delta;
        yield delta;
      }
    }

    const finalMessage = await stream.finalMessage();
    inputTokens = finalMessage.usage.input_tokens;
    outputTokens = finalMessage.usage.output_tokens;

    const latencyMs = Date.now() - start;
    const cost = calculateCost(model, inputTokens, outputTokens);

    logLLMCall({
      provider: 'anthropic',
      model,
      inputTokens,
      outputTokens,
      cost,
      latencyMs,
      prompt: params.prompt,
      response: fullResponse,
    });
  }
}
