import { Injectable } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';
import { ArticleService } from '../../article/article.service';
import { ArticleStatus } from '../../common/enums/article-status.enum';
import { AppErrorMessages } from '../../common/errors/app-error-messages';
import { NotFoundError } from '../../common/errors';
import { AiEndpoint } from '../ai.types';
import { GeminiService } from '../gemini/gemini.service';
import { GeminiEmbeddingTaskType } from '../gemini/gemini.types';
import { AiUsageService } from '../usage/ai-usage.service';
import { RagChunkerService } from './chunking/rag-chunker.service';
import {
  ReindexRequestDto,
  ReindexResponseDto,
  RagChatRequestDto,
  RagChatResponseDto,
  RagHistoryResponseDto,
  RagSearchRequestDto,
  RagSearchResponseDto,
} from './dto';
import { RagConversationMemoryService } from './memory/rag-conversation-memory.service';
import { buildRagChatPrompt } from './prompts/rag-chat.prompt';
import { RagChunk, RagSearchFilters, RagSearchResult } from './rag.types';
import { QdrantVectorStoreService, RagVectorPoint } from './vector';

const qdrantPointNamespace = 'b63f5d8e-51f2-42d7-951e-28e4dfcc3f9b';
const defaultChatLimit = 5;

@Injectable()
export class RagService {
  constructor(
    private readonly articleService: ArticleService,
    private readonly geminiService: GeminiService,
    private readonly chunkerService: RagChunkerService,
    private readonly vectorStoreService: QdrantVectorStoreService,
    private readonly conversationMemoryService: RagConversationMemoryService,
    private readonly usageService: AiUsageService,
  ) {}

  async reindex(payload: ReindexRequestDto = {}): Promise<ReindexResponseDto> {
    const startedAt = Date.now();
    const onlyPublished = payload.onlyPublished ?? true;
    const articles = payload.articleIds?.length
      ? await Promise.all(payload.articleIds.map((articleId) => this.articleService.getByIdOrThrow(articleId)))
      : await this.articleService.findAll(onlyPublished ? { status: ArticleStatus.PUBLISHED } : {});

    if (!payload.articleIds?.length) {
      await this.vectorStoreService.deleteCollectionIfExists();
    }

    let indexedArticles = 0;
    let indexedChunks = 0;

    for (const article of articles) {
      if (payload.articleIds?.length) {
        await this.vectorStoreService.deleteByArticleId(article.id);
      }

      if (onlyPublished && article.status !== ArticleStatus.PUBLISHED) {
        continue;
      }

      const chunks = this.chunkerService.chunkArticle(article);
      const points = await this.toVectorPoints(chunks);

      await this.vectorStoreService.upsert(points);
      indexedArticles += points.length ? 1 : 0;
      indexedChunks += points.length;
    }

    this.usageService.recordRequest(AiEndpoint.RAG_INDEX, Date.now() - startedAt);

    return {
      indexedArticles,
      indexedChunks,
      vectorCollection: this.vectorStoreService.getCollectionName(),
    };
  }

  async search(payload: RagSearchRequestDto): Promise<RagSearchResponseDto> {
    const startedAt = Date.now();
    const results = await this.retrieve(payload.query, payload.limit ?? 5, {
      articleStatus: payload.articleStatus,
      categoryId: payload.categoryId,
      tags: payload.tags,
    });

    this.usageService.recordRequest(AiEndpoint.RAG_SEARCH, Date.now() - startedAt);

    return { results };
  }

  async chat(payload: RagChatRequestDto): Promise<RagChatResponseDto> {
    const startedAt = Date.now();
    const { conversationId, history } = this.conversationMemoryService.getHistory(payload.conversationId);
    const retrievedChunks = await this.retrieve(payload.question, defaultChatLimit);

    if (!retrievedChunks.length) {
      const answer = 'Knowledge Hub sources do not contain enough information to answer this question.';

      this.conversationMemoryService.append(conversationId, payload.question, answer);
      this.usageService.recordRequest(AiEndpoint.RAG_CHAT, Date.now() - startedAt);

      return {
        answer,
        conversationId,
        sources: [],
      };
    }

    const result = await this.geminiService.generateContent(
      buildRagChatPrompt(payload.question, retrievedChunks, history),
    );
    const sources = retrievedChunks.map((chunk) => ({
      articleId: chunk.articleId,
      articleTitle: chunk.articleTitle,
      relevantChunk: chunk.chunk,
    }));

    this.conversationMemoryService.append(conversationId, payload.question, result.text);
    this.usageService.recordRequest(AiEndpoint.RAG_CHAT, Date.now() - startedAt, result.usage);

    return {
      answer: result.text,
      conversationId,
      sources,
    };
  }

  async deleteArticleIndex(articleId: string): Promise<void> {
    const startedAt = Date.now();
    const deleted = await this.vectorStoreService.deleteByArticleId(articleId);

    if (!deleted) {
      throw new NotFoundError(AppErrorMessages.RAG_INDEX_ENTRY_NOT_FOUND);
    }

    this.usageService.recordRequest(AiEndpoint.RAG_DELETE_INDEX, Date.now() - startedAt);
  }

  getHistory(conversationId: string): RagHistoryResponseDto {
    const messages = this.conversationMemoryService.getConversation(conversationId);

    if (!messages) {
      throw new NotFoundError(AppErrorMessages.RAG_CONVERSATION_NOT_FOUND);
    }

    return {
      conversationId,
      messages,
      maxMessages: this.conversationMemoryService.getMaxMessages(),
    };
  }

  private async retrieve(query: string, limit: number, filters: RagSearchFilters = {}): Promise<RagSearchResult[]> {
    const queryVector = await this.geminiService.embedContent(query, GeminiEmbeddingTaskType.RETRIEVAL_QUERY);
    const hits = await this.vectorStoreService.search(queryVector, limit, filters);

    return hits.map((hit) => ({
      articleId: hit.payload.articleId,
      articleTitle: hit.payload.articleTitle,
      chunk: hit.payload.chunk,
      similarity: Number(hit.score.toFixed(4)),
    }));
  }

  private async toVectorPoints(chunks: RagChunk[]): Promise<RagVectorPoint[]> {
    const points: RagVectorPoint[] = [];

    for (const chunk of chunks) {
      const vector = await this.geminiService.embedContent(chunk.chunk, GeminiEmbeddingTaskType.RETRIEVAL_DOCUMENT);

      points.push({
        id: uuidv5(`${chunk.articleId}:${chunk.chunkIndex}:${chunk.chunkHash}`, qdrantPointNamespace),
        vector,
        payload: {
          articleId: chunk.articleId,
          articleTitle: chunk.articleTitle,
          articleStatus: chunk.articleStatus,
          categoryId: chunk.categoryId,
          tags: chunk.tags,
          chunk: chunk.chunk,
          chunkIndex: chunk.chunkIndex,
          chunkHash: chunk.chunkHash,
          articleUpdatedAt: chunk.articleUpdatedAt,
        },
      });
    }

    return points;
  }
}
