import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod';
import swagger from '@fastify/swagger';
import scalarReference from '@scalar/fastify-api-reference';
import { C } from '../config.js';
import { registerCors } from './plugins/cors.js';
import { registerHelmet } from './plugins/helmet.js';
import { registerChatRoutes } from './routes/chat.js';

async function start(): Promise<void> {
  const app = Fastify({ logger: true });

  // Zod drives both validation and OpenAPI schema — single source of truth
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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

  // Scalar UI at /docs
  await app.register(scalarReference, {
    routePrefix: '/docs',
  });

  // Routes
  await registerChatRoutes(app);

  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        description: 'Service health check',
      },
    },
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
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void start();
