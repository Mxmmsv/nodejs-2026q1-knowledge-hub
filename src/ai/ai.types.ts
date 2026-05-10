export const AiEndpoint = {
  SUMMARIZE_ARTICLE: 'summarizeArticle',
  TRANSLATE_ARTICLE: 'translateArticle',
  ANALYZE_ARTICLE: 'analyzeArticle',
  GENERATE: 'generate',
  RAG_INDEX: 'ragIndex',
  RAG_SEARCH: 'ragSearch',
  RAG_CHAT: 'ragChat',
  RAG_DELETE_INDEX: 'ragDeleteIndex',
} as const;

export type AiEndpoint = (typeof AiEndpoint)[keyof typeof AiEndpoint];

export interface AiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
