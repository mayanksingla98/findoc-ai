import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export async function registerCors(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: process.env['NODE_ENV'] === 'production' ? false : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });
}
