import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import { C } from '../../config.js';

export async function registerHelmet(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: C.NODE_ENV === 'production',
  });
}
