import { Langfuse } from 'langfuse';
import { C } from '../config.js';
import { logger } from '../logger.js';

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

  const publicKey = C.LANGFUSE_PUBLIC_KEY;
  const secretKey = C.LANGFUSE_SECRET_KEY;
  const host = C.LANGFUSE_HOST;

  if (!publicKey || !secretKey) {
    logger.warn('[LLMOps] Langfuse keys not configured — skipping trace logging');
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
      logger.info(
        {
          provider: log.provider,
          model: log.model,
          inputTokens: log.inputTokens,
          outputTokens: log.outputTokens,
          cost: log.cost,
          latencyMs: log.latencyMs,
        },
        '[LLMOps] LLM call (Langfuse disabled)',
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

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - log.latencyMs);

    trace.generation({
      name: 'llm-call',
      model: log.model,
      startTime,
      endTime,
      input: log.prompt,
      output: log.response,
      usage: {
        input: log.inputTokens,
        output: log.outputTokens,
      },
      metadata: {
        cost: log.cost,
        provider: log.provider,
        ...log.metadata,
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, '[LLMOps] Failed to log LLM call to Langfuse');
  }
}

export async function shutdownLogger(): Promise<void> {
  try {
    if (langfuseClient) {
      await langfuseClient.shutdownAsync();
      langfuseClient = null;
    }
  } catch (error: unknown) {
    logger.error({ err: error }, '[LLMOps] Failed to flush Langfuse on shutdown');
  }
}

export type { LLMCallLog };
