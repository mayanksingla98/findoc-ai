import type { IVectorDB } from "./interface.js";
import { PgVectorAdapter } from "./adapters/pgvector.js";
import { QdrantAdapter } from "./adapters/qdrant.js";
import { PineconeAdapter } from "./adapters/pinecone.js";
import { MilvusAdapter } from "./adapters/milvus.js";

const SUPPORTED_BACKENDS = ["pgvector", "qdrant", "pinecone", "milvus"] as const;
type VectorBackend = (typeof SUPPORTED_BACKENDS)[number];

function isSupportedBackend(value: string): value is VectorBackend {
  return (SUPPORTED_BACKENDS as readonly string[]).includes(value);
}

export function createVectorDB(): IVectorDB {
  const backend = process.env["VECTOR_DB"];

  if (!backend) {
    throw new Error(
      `VECTOR_DB environment variable is required. Supported values: ${SUPPORTED_BACKENDS.join(", ")}`
    );
  }

  if (!isSupportedBackend(backend)) {
    throw new Error(
      `Unsupported VECTOR_DB value: "${backend}". Supported values: ${SUPPORTED_BACKENDS.join(", ")}`
    );
  }

  switch (backend) {
    case "pgvector":
      return new PgVectorAdapter();
    case "qdrant":
      return new QdrantAdapter();
    case "pinecone":
      return new PineconeAdapter();
    case "milvus":
      return new MilvusAdapter();
  }
}
