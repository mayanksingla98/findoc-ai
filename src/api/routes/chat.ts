import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { createLLMClient } from '../../llm/index.js';
import { routeModel } from '../../llmops/router.js';
import { C } from '../../config.js';

const ChatRequestBody = z.object({
  message: z.string().min(1, 'message must be at least 1 character'),
  systemPrompt: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

const ChatResponseBody = z.object({
  text: z.string(),
  model: z.string(),
  cost: z.number(),
  latencyMs: z.number(),
});

const ErrorResponseBody = z.object({
  error: z.string(),
  message: z.string(),
});

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/chat',
    {
      schema: {
        tags: ['Chat'],
        description: 'Send a message to the LLM. Supports synchronous JSON and streaming responses.',
        body: ChatRequestBody,
        response: { 200: ChatResponseBody, 500: ErrorResponseBody },
      },
    },
    async (request, reply) => {
      const { message, systemPrompt, stream } = request.body;
      const resolvedSystemPrompt = systemPrompt ?? C.DEFAULT_CHAT_SYSTEM_PROMPT;

      try {
        const routeDecision = routeModel(message, 'general');
        const llm = createLLMClient();

        if (stream) {
          void reply.raw.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });

          const chunks = llm.stream({
            prompt: message,
            systemPrompt: resolvedSystemPrompt,
            model: routeDecision.model,
          });

          for await (const chunk of chunks) {
            reply.raw.write(chunk);
          }

          reply.raw.end();
          return reply;
        }

        const result = await llm.complete({
          prompt: message,
          systemPrompt: resolvedSystemPrompt,
          model: routeDecision.model,
        });

        return reply.status(200).send({
          text: result.text,
          model: result.model,
          cost: result.cost,
          latencyMs: result.latencyMs,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        app.log.error({ error }, 'Chat endpoint error');
        return reply.status(500).send({ error: 'Internal server error', message: errorMessage });
      }
    },
  );
}
