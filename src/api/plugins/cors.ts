import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { C } from '../../config.js';

export async function registerCors(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: C.NODE_ENV === 'production' ? false : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });
}
