import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ArticleAnalysisTask {
  REVIEW = 'review',
  BUGS = 'bugs',
  OPTIMIZE = 'optimize',
  EXPLAIN = 'explain',
}

export enum ArticleAnalysisSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export class AnalyzeArticleDto {
  @ApiPropertyOptional({
    enum: ArticleAnalysisTask,
    default: ArticleAnalysisTask.REVIEW,
  })
  @IsOptional()
  @IsEnum(ArticleAnalysisTask)
  task: ArticleAnalysisTask = ArticleAnalysisTask.REVIEW;
}
