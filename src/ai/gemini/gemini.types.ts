import { AiTokenUsage } from '../ai.types';

export interface GeminiGenerateResult {
  text: string;
  usage?: AiTokenUsage;
}

export const GeminiEmbeddingTaskType = {
  RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT',
  RETRIEVAL_QUERY: 'RETRIEVAL_QUERY',
} as const;

export type GeminiEmbeddingTaskType = (typeof GeminiEmbeddingTaskType)[keyof typeof GeminiEmbeddingTaskType];

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: GeminiUsageMetadata;
}

export interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}
