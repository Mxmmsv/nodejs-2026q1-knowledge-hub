import { AiTokenUsage } from '../ai.types';

export interface GeminiGenerateResult {
  text: string;
  usage?: AiTokenUsage;
}

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
