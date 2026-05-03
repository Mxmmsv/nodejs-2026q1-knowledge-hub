import { Injectable } from '@nestjs/common';
import { ArticleService } from '../article/article.service';
import {
  AnalyzeArticleDto,
  AnalyzeArticleResponseDto,
  GenerateDto,
  GenerateResponseDto,
  SummarizeArticleDto,
  SummarizeArticleResponseDto,
  TranslateArticleDto,
  TranslateArticleResponseDto,
} from './dto';
import { GeminiService } from './gemini/gemini.service';
import {
  buildAnalyzeArticlePrompt,
  buildGeneratePrompt,
  buildSummarizeArticlePrompt,
  buildTranslateArticlePrompt,
} from './prompts';
import { parseAnalyzeOutput, parseTranslateOutput } from './parsers/ai-output.parser';
import { AiEndpoint } from './ai.types';
import { AiCacheService } from './cache/ai-cache.service';
import { AiUsageService } from './usage/ai-usage.service';
import { AiConversationMemoryService } from './memory/ai-conversation-memory.service';

@Injectable()
export class AiService {
  constructor(
    private readonly articleService: ArticleService,
    private readonly geminiService: GeminiService,
    private readonly cacheService: AiCacheService,
    private readonly usageService: AiUsageService,
    private readonly conversationMemoryService: AiConversationMemoryService,
  ) {}

  async summarizeArticle(articleId: string, payload: SummarizeArticleDto): Promise<SummarizeArticleResponseDto> {
    const article = await this.articleService.getByIdOrThrow(articleId);
    const cacheKey = this.cacheService.createArticleKey(AiEndpoint.SUMMARIZE_ARTICLE, article, {
      maxLength: payload.maxLength,
    });
    const cachedResponse = this.cacheService.get<SummarizeArticleResponseDto>(cacheKey);

    if (cachedResponse) {
      this.usageService.recordCacheHit();
      return cachedResponse;
    }

    this.usageService.recordCacheMiss();

    const startedAt = Date.now();
    const result = await this.geminiService.generateContent(buildSummarizeArticlePrompt(article, payload.maxLength));
    const response = {
      articleId,
      summary: result.text,
      originalLength: article.content.length,
      summaryLength: result.text.length,
    };

    this.usageService.recordRequest(AiEndpoint.SUMMARIZE_ARTICLE, Date.now() - startedAt, result.usage);
    this.cacheService.set(cacheKey, response);

    return response;
  }

  async translateArticle(articleId: string, payload: TranslateArticleDto): Promise<TranslateArticleResponseDto> {
    const article = await this.articleService.getByIdOrThrow(articleId);
    const cacheKey = this.cacheService.createArticleKey(AiEndpoint.TRANSLATE_ARTICLE, article, {
      sourceLanguage: payload.sourceLanguage ?? '',
      targetLanguage: payload.targetLanguage,
    });
    const cachedResponse = this.cacheService.get<TranslateArticleResponseDto>(cacheKey);

    if (cachedResponse) {
      this.usageService.recordCacheHit();
      return cachedResponse;
    }

    this.usageService.recordCacheMiss();

    const startedAt = Date.now();
    const result = await this.geminiService.generateContent(
      buildTranslateArticlePrompt(article, payload.targetLanguage, payload.sourceLanguage),
    );
    const parsedOutput = parseTranslateOutput(result.text, payload.sourceLanguage);
    const response = {
      articleId,
      ...parsedOutput,
    };

    this.usageService.recordRequest(AiEndpoint.TRANSLATE_ARTICLE, Date.now() - startedAt, result.usage);
    this.cacheService.set(cacheKey, response);

    return response;
  }

  async analyzeArticle(articleId: string, payload: AnalyzeArticleDto): Promise<AnalyzeArticleResponseDto> {
    const article = await this.articleService.getByIdOrThrow(articleId);
    const startedAt = Date.now();
    const result = await this.geminiService.generateContent(buildAnalyzeArticlePrompt(article, payload.task));
    const parsedOutput = parseAnalyzeOutput(result.text);

    this.usageService.recordRequest(AiEndpoint.ANALYZE_ARTICLE, Date.now() - startedAt, result.usage);

    return {
      articleId,
      ...parsedOutput,
    };
  }

  async generate(payload: GenerateDto): Promise<GenerateResponseDto> {
    const { sessionId, history } = this.conversationMemoryService.getHistory(payload.sessionId);
    const startedAt = Date.now();
    const result = await this.geminiService.generateContent(
      buildGeneratePrompt(payload.prompt, history, payload.systemInstruction),
    );

    this.conversationMemoryService.append(sessionId, payload.prompt, result.text);
    this.usageService.recordRequest(AiEndpoint.GENERATE, Date.now() - startedAt, result.usage);

    return {
      sessionId,
      text: result.text,
    };
  }

  getUsage() {
    return this.usageService.getUsage();
  }
}
