import { Langfuse } from 'langfuse';

interface LLMCallLog {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  prompt: string;
  response: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

let langfuseClient: Langfuse | null = null;

function getLangfuseClient(): Langfuse | null {
  if (langfuseClient) {
    return langfuseClient;
  }

  const publicKey = process.env['LANGFUSE_PUBLIC_KEY'];
  const secretKey = process.env['LANGFUSE_SECRET_KEY'];
  const host = process.env['LANGFUSE_HOST'];

  if (!publicKey || !secretKey) {
    console.warn('[LLMOps] Langfuse keys not configured — skipping trace logging');
    return null;
  }

  langfuseClient = new Langfuse({
    publicKey,
    secretKey,
    ...(host ? { baseUrl: host } : {}),
  });

  return langfuseClient;
}

export async function logLLMCall(log: LLMCallLog): Promise<void> {
  try {
    const client = getLangfuseClient();

    if (!client) {
      console.info(
        `[LLMOps] ${log.provider}/${log.model} — ${log.inputTokens}+${log.outputTokens} tokens, $${log.cost.toFixed(6)}, ${log.latencyMs}ms`,
      );
      return;
    }

    const trace = client.trace({
      id: log.traceId ?? undefined,
      name: `${log.provider}/${log.model}`,
      metadata: {
        provider: log.provider,
        model: log.model,
        ...log.metadata,
      },
    });

    trace.generation({
      name: 'llm-call',
      model: log.model,
      input: log.prompt,
      output: log.response,
      usage: {
        input: log.inputTokens,
        output: log.outputTokens,
      },
      metadata: {
        cost: log.cost,
        latencyMs: log.latencyMs,
        provider: log.provider,
        ...log.metadata,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[LLMOps] Failed to log LLM call to Langfuse: ${message}`);
  }
}

export async function shutdownLogger(): Promise<void> {
  try {
    if (langfuseClient) {
      await langfuseClient.shutdownAsync();
      langfuseClient = null;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[LLMOps] Failed to flush Langfuse on shutdown: ${message}`);
  }
}

export type { LLMCallLog };
