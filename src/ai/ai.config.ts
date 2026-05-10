const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsedValue = Number.parseInt(value ?? '', 10);

  return Number.isNaN(parsedValue) || parsedValue <= 0 ? fallback : parsedValue;
};

const getEnvValue = (key: string, fallback: string): string => process.env[key]?.trim() || fallback;

export const getGeminiApiKey = (): string => process.env.GEMINI_API_KEY?.trim() ?? '';

export const getGeminiApiBaseUrl = (): string =>
  getEnvValue('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');

export const getGeminiModel = (): string => getEnvValue('GEMINI_MODEL', 'gemini-2.0-flash').replace(/^models\//, '');

export const getGeminiEmbeddingModel = (): string =>
  getEnvValue('GEMINI_EMBEDDING_MODEL', 'text-embedding-004').replace(/^models\//, '');

export const getAiRateLimitRpm = (): number => parsePositiveInteger(process.env.AI_RATE_LIMIT_RPM, 20);

export const getAiCacheTtlSeconds = (): number => parsePositiveInteger(process.env.AI_CACHE_TTL_SEC, 300);

export const getRagVectorDbProvider = (): string => getEnvValue('RAG_VECTOR_DB_PROVIDER', 'qdrant');

export const getRagVectorDbUrl = (): string =>
  getEnvValue('RAG_VECTOR_DB_URL', 'http://vectordb:6333').replace(/\/+$/, '');

export const getRagVectorCollection = (): string => getEnvValue('RAG_VECTOR_COLLECTION', 'knowledge_hub_articles');

export const getRagChunkSize = (): number => parsePositiveInteger(process.env.RAG_CHUNK_SIZE, 800);

export const getRagChunkOverlap = (): number => parsePositiveInteger(process.env.RAG_CHUNK_OVERLAP, 200);

export const getRagConversationMaxMessages = (): number =>
  parsePositiveInteger(process.env.RAG_CONVERSATION_MAX_MESSAGES, 20);
