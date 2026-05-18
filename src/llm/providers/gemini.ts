import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { ILLMClient, LLMCompletionParams, LLMCompletionResult } from '../interface.js';
import { C } from '../../config.js';
import { logLLMCall } from '../../llmops/logger.js';

interface TokenPricing {
  input: number;
  output: number;
}

/** Pricing per 1M tokens (USD) — free tier available on all models below */
const PRICING: Record<string, TokenPricing> = {
  // Gemini 2.5 (free tier: 10 RPM, 250K TPM, 500 RPD)
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
  'gemini-2.5-flash': { input: 0.15, output: 0.6 },
  // Gemini 2.5 Flash Lite (free tier: 15 RPM, 250K TPM, 1500 RPD)
  'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
  // Gemini 2.0 (free tier: 15 RPM, 1M TPM, 1500 RPD) — best for dev
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.3 },
  // Gemini 1.5 (free tier: 15 RPM, 1M TPM, 1500 RPD)
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
};

// gemini-2.0-flash: best free tier balance of speed, quality, and limits
const DEFAULT_MODEL = 'gemini-2.5-flash';

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

export class GeminiClient implements ILLMClient {
  private readonly client: GoogleGenerativeAI;

  constructor() {
    const apiKey = C.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required for the Gemini provider.');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const model = params.model ?? C.DEFAULT_MODEL ?? DEFAULT_MODEL;

    const genModel = this.client.getGenerativeModel(
      {
        model,
        safetySettings: SAFETY_SETTINGS,
        ...(params.systemPrompt ? { systemInstruction: params.systemPrompt } : {}),
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: params.maxTokens,
          ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      },
      { apiVersion: 'v1' },
    );

    const start = Date.now();
    const result = await genModel.generateContent(params.prompt);
    const latencyMs = Date.now() - start;

    const response = result.response;
    const text = response.text();
    const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
    const cost = calculateCost(model, inputTokens, outputTokens);

    logLLMCall({
      provider: 'gemini',
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
    const model = params.model ?? C.DEFAULT_MODEL ?? DEFAULT_MODEL;

    const genModel = this.client.getGenerativeModel(
      {
        model,
        safetySettings: SAFETY_SETTINGS,
        ...(params.systemPrompt ? { systemInstruction: params.systemPrompt } : {}),
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: params.maxTokens,
          ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      },
      { apiVersion: 'v1' },
    );

    const start = Date.now();
    let fullResponse = '';

    const result = await genModel.generateContentStream(params.prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        yield text;
      }
    }

    const finalResponse = await result.response;
    const latencyMs = Date.now() - start;
    const inputTokens = finalResponse.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = finalResponse.usageMetadata?.candidatesTokenCount ?? 0;
    const cost = calculateCost(model, inputTokens, outputTokens);

    logLLMCall({
      provider: 'gemini',
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
