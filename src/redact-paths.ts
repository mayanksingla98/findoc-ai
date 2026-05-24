/**
 * Single source of truth for what pino redacts from log output.
 *
 * Three categories:
 *   1. HEADER_PATHS       — request/response headers carrying auth or session info
 *   2. CREDENTIAL_FIELDS  — generic field names matched at any nesting depth
 *   3. ENV_VAR_NAMES      — project-specific env var keys (matched top-level and nested)
 *
 * When adding a new secret env var or credential field, add it to the right list
 * below — do NOT inline new paths in src/logger.ts.
 */

/** Header keys that may carry credentials or session identifiers. */
const HEADER_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  'req.headers["proxy-authorization"]',
  'res.headers["set-cookie"]',
] as const;

/**
 * Generic credential field names. Pino matches these at any object depth
 * via the leading `*.` wildcard — e.g. `*.token` catches `{ user: { token } }`
 * and `{ config: { auth: { token } } }`.
 */
const CREDENTIAL_FIELDS = [
  // API keys
  'apiKey',
  'api_key',
  'apikey',

  // Passwords
  'password',
  'passwd',

  // Generic secrets
  'secret',
  'clientSecret',

  // Tokens
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'sessionToken',

  // Keys
  'privateKey',

  // Connection strings (URLs often embed passwords)
  'connectionString',
  'databaseUrl',
] as const;

/**
 * Project-specific env var names. Each is redacted both as a top-level key
 * (in case `process.env` is logged) and nested (in case the config object is logged).
 */
const ENV_VAR_NAMES = [
  // LLM provider keys
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'XAI_API_KEY',

  // Vector DB keys
  'PINECONE_API_KEY',

  // Observability keys
  'LANGFUSE_SECRET_KEY',
  'LANGFUSE_PUBLIC_KEY',

  // Connection strings (embed credentials in the URL)
  'DATABASE_URL',
  'REDIS_URL',
  'QDRANT_URL',
  'MILVUS_URL',
] as const;

/** Match a field name at any nesting depth. */
const nested = (field: string): string => `*.${field}`;

/** Match an env-var-style key at top-level AND nested under any object. */
const topLevelAndNested = (name: string): string[] => [name, `*.${name}`];

export const REDACT_PATHS: readonly string[] = [
  ...HEADER_PATHS,
  ...CREDENTIAL_FIELDS.map(nested),
  ...ENV_VAR_NAMES.flatMap(topLevelAndNested),
];
