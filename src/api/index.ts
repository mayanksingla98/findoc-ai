import Fastify, { type FastifyError } from 'fastify';
import { serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod';
import swagger from '@fastify/swagger';
import scalarReference from '@scalar/fastify-api-reference';
import { C } from '../config.js';
import { logger } from '../logger.js';
import { AppError } from '../errors.js';
import { shutdownLogger } from '../llmops/logger.js';
import { registerCors } from './plugins/cors.js';
import { registerHelmet } from './plugins/helmet.js';
import { registerChatRoutes } from './routes/chat.js';

async function start(): Promise<void> {
  const app = Fastify({ loggerInstance: logger });

  // Zod drives both validation and OpenAPI schema — single source of truth.
  // The Zod type provider also handles validation errors → 400 automatically.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Global error handler — routes can throw freely.
  // AppError subclasses → mapped status codes. Anything else → 500.
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn(
        { err: error, code: error.code, statusCode: error.statusCode, details: error.details },
        'Request failed',
      );
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }

    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      error: 'internal_error',
      message: C.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
    });
  });

  // Plugins
  await registerCors(app);
  await registerHelmet(app);

  // Swagger (OpenAPI spec auto-generated from Zod schemas)
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'FinDoc AI',
        description: 'Financial Document Intelligence API',
        version: '0.1.0',
      },
      tags: [
        { name: 'Chat', description: 'LLM chat endpoints' },
        { name: 'Health', description: 'Service health checks' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(scalarReference, { routePrefix: '/docs' });

  // Routes
  await registerChatRoutes(app);

  app.get(
    '/health',
    { schema: { tags: ['Health'], description: 'Service health check' } },
    async () => ({ status: 'ok' }),
  );

  const port = C.PORT;

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(
      {
        llmProvider: C.LLM_PROVIDER,
        embeddingProvider: C.EMBEDDING_PROVIDER,
        vectorDb: C.VECTOR_DB,
        docs: `http://localhost:${String(port)}/docs`,
      },
      `FinDoc AI server started on port ${String(port)}`,
    );
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    await app.close();
    await shutdownLogger();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

void start();
