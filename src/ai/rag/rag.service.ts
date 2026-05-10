import { Injectable } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';
import { ArticleService } from '../../article/article.service';
import { Article } from '../../article/models/article.model';
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
const hybridCandidateMultiplier = 4;
const semanticWeight = 0.72;
const lexicalWeight = 0.28;

interface RagRetrievalCandidate extends RagSearchResult {
  articleStatus?: ArticleStatus;
  categoryId?: string | null;
  chunkHash?: string;
  finalScore: number;
  lexicalScore: number;
  semanticScore: number;
  tags: string[];
}

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
    const targetArticleIds = new Set(articles.map((article) => article.id));

    let indexedArticles = 0;
    let indexedChunks = 0;

    if (!payload.articleIds?.length) {
      await this.deleteStaleIndexedArticles(targetArticleIds);
    }

    for (const article of articles) {
      if (onlyPublished && article.status !== ArticleStatus.PUBLISHED) {
        await this.vectorStoreService.deleteByArticleId(article.id);
        continue;
      }

      const chunks = this.chunkerService.chunkArticle(article);

      if (await this.isArticleIndexFresh(article.id, chunks)) {
        continue;
      }

      const points = await this.toVectorPoints(chunks);

      await this.vectorStoreService.deleteByArticleId(article.id);
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
    const vectorLimit = Math.max(limit, Math.min(20, limit * hybridCandidateMultiplier));
    const hits = await this.vectorStoreService.search(queryVector, vectorLimit, filters);
    const semanticCandidates = hits.map((hit): RagRetrievalCandidate => {
      const lexicalScore = this.calculateLexicalScore(
        query,
        hit.payload.chunk,
        hit.payload.articleTitle,
        hit.payload.tags,
      );
      const semanticScore = this.clampScore(hit.score);

      return {
        articleId: hit.payload.articleId,
        articleTitle: hit.payload.articleTitle,
        articleStatus: hit.payload.articleStatus,
        categoryId: hit.payload.categoryId,
        chunk: hit.payload.chunk,
        chunkHash: hit.payload.chunkHash,
        finalScore: 0,
        lexicalScore,
        semanticScore,
        similarity: 0,
        tags: hit.payload.tags,
      };
    });
    const lexicalCandidates = await this.getLexicalCandidates(query, filters);
    const rankedCandidates = this.rerankCandidates(query, [...semanticCandidates, ...lexicalCandidates]);

    return rankedCandidates.slice(0, limit).map((candidate) => ({
      articleId: candidate.articleId,
      articleTitle: candidate.articleTitle,
      chunk: candidate.chunk,
      similarity: Number(candidate.finalScore.toFixed(4)),
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

  private async deleteStaleIndexedArticles(targetArticleIds: Set<string>): Promise<void> {
    const indexedArticleIds = await this.vectorStoreService.getIndexedArticleIds();

    for (const indexedArticleId of indexedArticleIds) {
      if (!targetArticleIds.has(indexedArticleId)) {
        await this.vectorStoreService.deleteByArticleId(indexedArticleId);
      }
    }
  }

  private async isArticleIndexFresh(articleId: string, chunks: RagChunk[]): Promise<boolean> {
    const indexedChunkHashes = await this.vectorStoreService.getArticleChunkHashes(articleId);

    if (indexedChunkHashes.length === 0 || indexedChunkHashes.length !== chunks.length) {
      return false;
    }

    const nextChunkHashes = chunks.map((chunk) => chunk.chunkHash).sort();

    return indexedChunkHashes.every((chunkHash, index) => chunkHash === nextChunkHashes[index]);
  }

  private async getLexicalCandidates(query: string, filters: RagSearchFilters): Promise<RagRetrievalCandidate[]> {
    const articles = await this.getArticlesForLexicalSearch(filters);
    const candidates = articles.flatMap((article) =>
      this.chunkerService
        .chunkArticle(article)
        .map((chunk) => {
          const lexicalScore = this.calculateLexicalScore(query, chunk.chunk, article.title, article.tags);

          return {
            articleId: article.id,
            articleTitle: article.title,
            articleStatus: article.status,
            categoryId: article.categoryId,
            chunk: chunk.chunk,
            chunkHash: chunk.chunkHash,
            finalScore: 0,
            lexicalScore,
            semanticScore: 0,
            similarity: 0,
            tags: article.tags,
          };
        })
        .filter((candidate) => candidate.lexicalScore > 0),
    );

    return candidates
      .sort((left, right) => right.lexicalScore - left.lexicalScore)
      .slice(0, Math.max(defaultChatLimit, hybridCandidateMultiplier * defaultChatLimit));
  }

  private async getArticlesForLexicalSearch(filters: RagSearchFilters): Promise<Article[]> {
    const articles = await this.articleService.findAll({
      categoryId: filters.categoryId,
      status: filters.articleStatus,
    });
    const requiredTags = filters.tags ?? [];

    if (!requiredTags.length) {
      return articles;
    }

    return articles.filter((article) => requiredTags.every((tag) => article.tags.includes(tag)));
  }

  private rerankCandidates(query: string, candidates: RagRetrievalCandidate[]): RagRetrievalCandidate[] {
    const mergedCandidates = new Map<string, RagRetrievalCandidate>();

    for (const candidate of candidates) {
      const key = `${candidate.articleId}:${candidate.chunkHash ?? candidate.chunk}`;
      const existingCandidate = mergedCandidates.get(key);

      if (!existingCandidate) {
        mergedCandidates.set(key, { ...candidate });
        continue;
      }

      existingCandidate.semanticScore = Math.max(existingCandidate.semanticScore, candidate.semanticScore);
      existingCandidate.lexicalScore = Math.max(existingCandidate.lexicalScore, candidate.lexicalScore);
    }

    return [...mergedCandidates.values()]
      .map((candidate) => ({
        ...candidate,
        finalScore: this.calculateFinalScore(query, candidate),
      }))
      .sort((left, right) => right.finalScore - left.finalScore);
  }

  private calculateFinalScore(query: string, candidate: RagRetrievalCandidate): number {
    const queryTokens = this.toTokens(query);
    const normalizedTitle = candidate.articleTitle.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    const hasTitlePhrase = normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle);
    const tagBoost = candidate.tags.some((tag) => queryTokens.includes(tag.toLowerCase())) ? 0.04 : 0;
    const titleBoost = hasTitlePhrase ? 0.08 : 0;
    const lexicalPresenceBoost = candidate.lexicalScore > 0 ? 0.02 : 0;

    return this.clampScore(
      candidate.semanticScore * semanticWeight +
        candidate.lexicalScore * lexicalWeight +
        titleBoost +
        tagBoost +
        lexicalPresenceBoost,
    );
  }

  private calculateLexicalScore(query: string, chunk: string, articleTitle: string, tags: string[]): number {
    const queryTokens = this.toTokens(query);

    if (!queryTokens.length) {
      return 0;
    }

    const searchableTokens = new Set(this.toTokens(`${articleTitle} ${tags.join(' ')} ${chunk}`));
    const matchedTokens = queryTokens.filter((token) => searchableTokens.has(token));
    const overlapScore = matchedTokens.length / queryTokens.length;
    const phraseBoost = chunk.toLowerCase().includes(query.toLowerCase()) ? 0.2 : 0;

    return this.clampScore(overlapScore + phraseBoost);
  }

  private toTokens(value: string): string[] {
    return [
      ...new Set(
        value
          .toLowerCase()
          .split(/[^a-zа-яё0-9]+/iu)
          .map((token) => token.trim())
          .filter((token) => token.length >= 2),
      ),
    ];
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(1, score));
  }
}
