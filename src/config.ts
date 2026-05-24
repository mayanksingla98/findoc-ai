import 'dotenv/config';
import './utils/zod-ext.js';
import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'gemini', 'grok']).default('openai'),
  EMBEDDING_PROVIDER: z.enum(['openai', 'cohere']).default('openai'),
  VECTOR_DB: z.enum(['pgvector', 'qdrant', 'pinecone', 'milvus']).default('pgvector'),

  DEFAULT_MODEL: z.string().min(1).optional(),
  CHEAP_MODEL: z.string().min(1).optional(),

  OPENAI_API_KEY: z.string().min(1).optional().reqIf('LLM_PROVIDER', 'openai').reqIf('EMBEDDING_PROVIDER', 'openai'),
  ANTHROPIC_API_KEY: z.string().min(1).optional().reqIf('LLM_PROVIDER', 'anthropic'),
  GEMINI_API_KEY: z.string().min(1).optional().reqIf('LLM_PROVIDER', 'gemini'),
  XAI_API_KEY: z.string().min(1).optional().reqIf('LLM_PROVIDER', 'grok'),

  EMBEDDING_MODEL: z.string().min(1).default('text-embedding-3-small'),

  DATABASE_URL: z.string().min(1).optional().reqIf('VECTOR_DB', 'pgvector'),
  QDRANT_URL: z.string().min(1).optional().reqIf('VECTOR_DB', 'qdrant'),
  PINECONE_API_KEY: z.string().min(1).optional().reqIf('VECTOR_DB', 'pinecone'),
  PINECONE_INDEX: z.string().min(1).optional().reqIf('VECTOR_DB', 'pinecone'),
  MILVUS_URL: z.string().min(1).optional().reqIf('VECTOR_DB', 'milvus'),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  LANGFUSE_PUBLIC_KEY: z.string().min(1).optional(),
  LANGFUSE_SECRET_KEY: z.string().min(1).optional(),
  LANGFUSE_HOST: z.string().min(1).default('https://cloud.langfuse.com'),

  DEFAULT_CHAT_SYSTEM_PROMPT: z.string().min(1).optional(),
});

const rawEnv = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''));

export const C = Object.freeze(ConfigSchema.parse(rawEnv));
export type Config = typeof C;
