import pg from 'pg';
import pgvector from 'pgvector/pg';

import type { IVectorDB, VectorRecord, SimilarityResult } from '../interface.js';
import { C } from '../../config.js';

const { Pool } = pg;

let pool: pg.Pool | undefined;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = C.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for the pgvector adapter.');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

async function ensureVectorType(client: pg.PoolClient): Promise<void> {
  await pgvector.registerType(client);
}

export class PgVectorAdapter implements IVectorDB {
  async upsert(record: VectorRecord): Promise<void> {
    const client = await getPool().connect();
    try {
      await ensureVectorType(client);
      await client.query(
        `INSERT INTO chunks (id, text, embedding, metadata, tsv)
         VALUES ($1, $2, $3, $4, to_tsvector('english', $5))
         ON CONFLICT (id) DO UPDATE
           SET text      = EXCLUDED.text,
               embedding = EXCLUDED.embedding,
               metadata  = EXCLUDED.metadata,
               tsv       = EXCLUDED.tsv`,
        [record.id, record.text, pgvector.toSql(record.embedding), JSON.stringify(record.metadata), record.text],
      );
    } finally {
      client.release();
    }
  }

  async upsertBatch(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;

    const client = await getPool().connect();
    try {
      await ensureVectorType(client);

      // Build a single multi-row INSERT statement
      const valuePlaceholders: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      for (const record of records) {
        valuePlaceholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, to_tsvector('english', $${paramIndex + 4}))`,
        );
        params.push(
          record.id,
          record.text,
          pgvector.toSql(record.embedding),
          JSON.stringify(record.metadata),
          record.text,
        );
        paramIndex += 5;
      }

      await client.query(
        `INSERT INTO chunks (id, text, embedding, metadata, tsv)
         VALUES ${valuePlaceholders.join(', ')}
         ON CONFLICT (id) DO UPDATE
           SET text      = EXCLUDED.text,
               embedding = EXCLUDED.embedding,
               metadata  = EXCLUDED.metadata,
               tsv       = EXCLUDED.tsv`,
        params,
      );
    } finally {
      client.release();
    }
  }

  async similaritySearch(
    embedding: number[],
    topK: number,
    threshold?: number,
    metadataFilter?: Record<string, unknown>,
  ): Promise<SimilarityResult[]> {
    const client = await getPool().connect();
    try {
      await ensureVectorType(client);

      const conditions: string[] = [];
      const params: unknown[] = [pgvector.toSql(embedding)];
      let paramIndex = 2;

      // Optional cosine-similarity threshold:
      // cosine_similarity = 1 - cosine_distance
      if (threshold !== undefined) {
        conditions.push(`1 - (embedding <=> $1) >= $${paramIndex}`);
        params.push(threshold);
        paramIndex++;
      }

      // Optional JSONB metadata filter using the @> containment operator
      if (metadataFilter !== undefined) {
        conditions.push(`metadata @> $${paramIndex}::jsonb`);
        params.push(JSON.stringify(metadataFilter));
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      params.push(topK);

      const query = `
        SELECT
          id,
          text,
          1 - (embedding <=> $1) AS score,
          metadata
        FROM chunks
        ${whereClause}
        ORDER BY embedding <=> $1 ASC
        LIMIT $${paramIndex}
      `;

      const result = await client.query(query, params);

      return result.rows.map((row: { id: string; text: string; score: number; metadata: Record<string, unknown> }) => ({
        id: row.id as string,
        text: row.text as string,
        score: parseFloat(String(row.score)),
        metadata: row.metadata as Record<string, unknown>,
      }));
    } finally {
      client.release();
    }
  }

  async deleteByDocument(documentId: string): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query(`DELETE FROM chunks WHERE metadata->>'documentId' = $1`, [documentId]);
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await getPool().connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch {
      return false;
    }
  }
}
