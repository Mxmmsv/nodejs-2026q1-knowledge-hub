import { ArticleStatus } from '../../../common/enums/article-status.enum';

export interface RagVectorPayload {
  articleId: string;
  articleTitle: string;
  articleStatus: ArticleStatus;
  categoryId: string | null;
  tags: string[];
  chunk: string;
  chunkIndex: number;
  chunkHash: string;
  articleUpdatedAt: number;
}

export interface RagVectorPoint {
  id: string;
  vector: number[];
  payload: RagVectorPayload;
}

export interface RagVectorSearchFilter {
  articleStatus?: ArticleStatus;
  categoryId?: string;
  tags?: string[];
}

export interface RagVectorSearchHit {
  id: string | number;
  score: number;
  payload: RagVectorPayload;
}
