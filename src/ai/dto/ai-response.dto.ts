import { ApiProperty } from '@nestjs/swagger';
import { ArticleAnalysisSeverity } from './analyze-article.dto';

export class SummarizeArticleResponseDto {
  @ApiProperty({ format: 'uuid' })
  articleId: string;

  @ApiProperty()
  summary: string;

  @ApiProperty()
  originalLength: number;

  @ApiProperty()
  summaryLength: number;
}

export class TranslateArticleResponseDto {
  @ApiProperty({ format: 'uuid' })
  articleId: string;

  @ApiProperty()
  translatedText: string;

  @ApiProperty()
  detectedLanguage: string;
}

export class AnalyzeArticleResponseDto {
  @ApiProperty({ format: 'uuid' })
  articleId: string;

  @ApiProperty()
  analysis: string;

  @ApiProperty({ type: String, isArray: true })
  suggestions: string[];

  @ApiProperty({ enum: ArticleAnalysisSeverity })
  severity: ArticleAnalysisSeverity;
}

class TokenUsageResponseDto {
  @ApiProperty()
  promptTokens: number;

  @ApiProperty()
  completionTokens: number;

  @ApiProperty()
  totalTokens: number;
}

class LatencyMetricsResponseDto {
  @ApiProperty()
  count: number;

  @ApiProperty()
  averageMs: number;

  @ApiProperty()
  maxMs: number;

  @ApiProperty()
  lastMs: number;
}

class CacheMetricsResponseDto {
  @ApiProperty()
  hits: number;

  @ApiProperty()
  misses: number;

  @ApiProperty()
  hitRatio: number;
}

export class AiUsageResponseDto {
  @ApiProperty()
  startedAt: string;

  @ApiProperty()
  totalRequests: number;

  @ApiProperty({ type: Object })
  requestsByEndpoint: Record<string, number>;

  @ApiProperty({ type: TokenUsageResponseDto })
  tokenUsage: TokenUsageResponseDto;

  @ApiProperty({ type: LatencyMetricsResponseDto })
  latencyMs: LatencyMetricsResponseDto;

  @ApiProperty({ type: CacheMetricsResponseDto })
  cache: CacheMetricsResponseDto;
}

export class GenerateResponseDto {
  @ApiProperty({ format: 'uuid' })
  sessionId: string;

  @ApiProperty()
  text: string;
}
