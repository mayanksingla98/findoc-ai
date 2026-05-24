import type {
  ILLMClient,
  LLMCompletionParams,
  LLMCompletionResult,
} from '../llm/interface.js';
import { logLLMCall } from './logger.js';

export interface ObservabilityContext {
  /** Request/trace ID, threaded into Langfuse so logs and traces correlate. */
  traceId?: string;
  /** Arbitrary metadata attached to the trace. */
  metadata?: Record<string, unknown>;
}

/**
 * Decorator that wraps any ILLMClient with Langfuse observability.
 * Providers stay pure — this layer measures latency and emits traces.
 *
 * Use `withContext(ctx)` to attach a request-scoped traceId/metadata
 * without mutating the underlying client.
 */
export class ObservableLLMClient implements ILLMClient {
  constructor(
    private readonly inner: ILLMClient,
    private readonly context: ObservabilityContext = {},
  ) {}

  get provider(): string {
    return this.inner.provider;
  }

  withContext(context: ObservabilityContext): ObservableLLMClient {
    return new ObservableLLMClient(this.inner, { ...this.context, ...context });
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const result = await this.inner.complete(params);
    await this.emit(params, result);
    return result;
  }

  async *stream(
    params: LLMCompletionParams,
  ): AsyncGenerator<string, LLMCompletionResult, unknown> {
    const inner = this.inner.stream(params);
    const result = yield* inner;
    await this.emit(params, result);
    return result;
  }

  private async emit(params: LLMCompletionParams, result: LLMCompletionResult): Promise<void> {
    await logLLMCall({
      provider: this.inner.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost: result.cost,
      latencyMs: result.latencyMs,
      prompt: params.prompt,
      response: result.text,
      ...(this.context.traceId ? { traceId: this.context.traceId } : {}),
      ...(this.context.metadata ? { metadata: this.context.metadata } : {}),
    });
  }
}
