import type { IVectorDB } from './interface.js';
import { C } from '../config.js';
import { PgVectorAdapter } from './adapters/pgvector.js';
import { QdrantAdapter } from './adapters/qdrant.js';
import { PineconeAdapter } from './adapters/pinecone.js';
import { MilvusAdapter } from './adapters/milvus.js';

export function createVectorDB(): IVectorDB {
  switch (C.VECTOR_DB) {
    case 'pgvector':
      return new PgVectorAdapter();
    case 'qdrant':
      return new QdrantAdapter();
    case 'pinecone':
      return new PineconeAdapter();
    case 'milvus':
      return new MilvusAdapter();
  }
}
