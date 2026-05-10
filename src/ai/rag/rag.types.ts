import { ArticleStatus } from '../../common/enums/article-status.enum';

export interface RagChunk {
  articleId: string;
  articleTitle: string;
  articleStatus: ArticleStatus;
  categoryId: string | null;
  tags: string[];
  articleUpdatedAt: number;
  chunk: string;
  chunkIndex: number;
  chunkHash: string;
}

export interface RagSearchFilters {
  articleStatus?: ArticleStatus;
  categoryId?: string;
  tags?: string[];
}

export interface RagSearchResult {
  articleId: string;
  articleTitle: string;
  chunk: string;
  similarity: number;
}

export interface RagSource {
  articleId: string;
  articleTitle: string;
  relevantChunk: string;
}

export interface RagConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}
