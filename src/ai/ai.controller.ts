import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { createErrorResponse } from '../common/swagger/create-error-response';
import { AiRateLimitGuard } from './rate-limit/ai-rate-limit.guard';
import { AiService } from './ai.service';
import {
  AiUsageResponseDto,
  AnalyzeArticleDto,
  AnalyzeArticleResponseDto,
  GenerateDto,
  GenerateResponseDto,
  SummarizeArticleDto,
  SummarizeArticleResponseDto,
  TranslateArticleDto,
  TranslateArticleResponseDto,
} from './dto';

const invalidRequestResponse = createErrorResponse({
  description: 'Returns bad request for invalid params or body.',
  example: {
    statusCode: 400,
    error: 'Bad Request',
    message: 'Invalid UUID',
  },
});

const articleNotFoundResponse = createErrorResponse({
  description: 'Returns not found when the article does not exist.',
  example: {
    statusCode: 404,
    error: 'Not Found',
    message: 'Article not found',
  },
});

const rateLimitResponse = createErrorResponse({
  description: 'Returns too many requests when AI RPM is exceeded.',
  example: {
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Too many AI requests, please try again later',
  },
});

const aiConfigurationResponse = createErrorResponse({
  description: 'Returns internal error for AI configuration/auth failures.',
  example: {
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'AI provider authentication failed',
  },
});

const aiUnavailableResponse = createErrorResponse({
  description: 'Returns service unavailable when Gemini is unavailable.',
  example: {
    statusCode: 503,
    error: 'Service Unavailable',
    message: 'AI provider is temporarily unavailable',
  },
});

@ApiTags('AI')
@ApiExtraModels(ErrorResponseDto)
@Public()
@UseGuards(AiRateLimitGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOkResponse({
    description: 'Generates a summary for an existing article.',
    type: SummarizeArticleResponseDto,
  })
  @ApiBadRequestResponse(invalidRequestResponse)
  @ApiNotFoundResponse(articleNotFoundResponse)
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @ApiInternalServerErrorResponse(aiConfigurationResponse)
  @ApiServiceUnavailableResponse(aiUnavailableResponse)
  @Post('articles/:articleId/summarize')
  @HttpCode(HttpStatus.OK)
  summarizeArticle(
    @Param('articleId', UuidParamPipe) articleId: string,
    @Body() body: SummarizeArticleDto,
  ): Promise<SummarizeArticleResponseDto> {
    return this.aiService.summarizeArticle(articleId, body);
  }

  @ApiOkResponse({
    description: 'Translates article content for an existing article.',
    type: TranslateArticleResponseDto,
  })
  @ApiBadRequestResponse(invalidRequestResponse)
  @ApiNotFoundResponse(articleNotFoundResponse)
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @ApiInternalServerErrorResponse(aiConfigurationResponse)
  @ApiServiceUnavailableResponse(aiUnavailableResponse)
  @Post('articles/:articleId/translate')
  @HttpCode(HttpStatus.OK)
  translateArticle(
    @Param('articleId', UuidParamPipe) articleId: string,
    @Body() body: TranslateArticleDto,
  ): Promise<TranslateArticleResponseDto> {
    return this.aiService.translateArticle(articleId, body);
  }

  @ApiOkResponse({
    description: 'Analyzes article content and returns review insights.',
    type: AnalyzeArticleResponseDto,
  })
  @ApiBadRequestResponse(invalidRequestResponse)
  @ApiNotFoundResponse(articleNotFoundResponse)
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @ApiInternalServerErrorResponse(aiConfigurationResponse)
  @ApiServiceUnavailableResponse(aiUnavailableResponse)
  @Post('articles/:articleId/analyze')
  @HttpCode(HttpStatus.OK)
  analyzeArticle(
    @Param('articleId', UuidParamPipe) articleId: string,
    @Body() body: AnalyzeArticleDto,
  ): Promise<AnalyzeArticleResponseDto> {
    return this.aiService.analyzeArticle(articleId, body);
  }

  @ApiOkResponse({
    description: 'Generates free-form AI text with optional short-term session context.',
    type: GenerateResponseDto,
  })
  @ApiBadRequestResponse(invalidRequestResponse)
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @ApiInternalServerErrorResponse(aiConfigurationResponse)
  @ApiServiceUnavailableResponse(aiUnavailableResponse)
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  generate(@Body() body: GenerateDto): Promise<GenerateResponseDto> {
    return this.aiService.generate(body);
  }

  @ApiOkResponse({
    description: 'Returns in-memory AI usage metrics since service startup.',
    type: AiUsageResponseDto,
  })
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @Get('usage')
  getUsage(): AiUsageResponseDto {
    return this.aiService.getUsage();
  }
}
