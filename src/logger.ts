import pino from 'pino';
import type { FastifyBaseLogger } from 'fastify';
import { C } from './config.js';
import { REDACT_PATHS } from './redact-paths.js';

/**
 * Shared logger. Fastify consumes this directly via `loggerInstance`.
 * For pretty-printed dev output, pipe through pino-pretty in package.json.
 * In request handlers, prefer `request.log` — it includes the reqId.
 */
export const logger: FastifyBaseLogger = pino({
  level: C.LOG_LEVEL,
  redact: { paths: [...REDACT_PATHS], censor: '[REDACTED]' },
});
