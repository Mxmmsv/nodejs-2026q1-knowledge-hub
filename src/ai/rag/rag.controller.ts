import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { createErrorResponse } from '../../common/swagger/create-error-response';
import { AiRateLimitGuard } from '../rate-limit/ai-rate-limit.guard';
import {
  RagChatRequestDto,
  RagChatResponseDto,
  RagHistoryResponseDto,
  RagSearchRequestDto,
  RagSearchResponseDto,
  ReindexRequestDto,
  ReindexResponseDto,
} from './dto';
import { RagService } from './rag.service';

const invalidRequestResponse = createErrorResponse({
  description: 'Returns bad request for invalid params or body.',
  example: {
    statusCode: 400,
    error: 'Bad Request',
    message: 'Validation failed',
  },
});

const notFoundResponse = createErrorResponse({
  description: 'Returns not found when the requested RAG resource does not exist.',
  example: {
    statusCode: 404,
    error: 'Not Found',
    message: 'RAG index entry not found',
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

const dependencyUnavailableResponse = createErrorResponse({
  description: 'Returns service unavailable when Gemini or vector DB is unavailable.',
  example: {
    statusCode: 503,
    error: 'Service Unavailable',
    message: 'Vector database is temporarily unavailable',
  },
});

@ApiTags('AI RAG')
@ApiExtraModels(ErrorResponseDto)
@Public()
@UseGuards(AiRateLimitGuard)
@Controller('ai/rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @ApiOkResponse({
    description: 'Builds or refreshes the vector index from Knowledge Hub articles.',
    type: ReindexResponseDto,
  })
  @ApiBadRequestResponse(invalidRequestResponse)
  @ApiNotFoundResponse(notFoundResponse)
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @ApiInternalServerErrorResponse(aiConfigurationResponse)
  @ApiServiceUnavailableResponse(dependencyUnavailableResponse)
  @Post('index')
  @HttpCode(HttpStatus.OK)
  reindex(@Body() body: ReindexRequestDto): Promise<ReindexResponseDto> {
    return this.ragService.reindex(body);
  }

  @ApiOkResponse({
    description: 'Runs semantic search over indexed Knowledge Hub chunks.',
    type: RagSearchResponseDto,
  })
  @ApiBadRequestResponse(invalidRequestResponse)
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @ApiInternalServerErrorResponse(aiConfigurationResponse)
  @ApiServiceUnavailableResponse(dependencyUnavailableResponse)
  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() body: RagSearchRequestDto): Promise<RagSearchResponseDto> {
    return this.ragService.search(body);
  }

  @ApiOkResponse({
    description: 'Answers a question with retrieved Knowledge Hub sources.',
    type: RagChatResponseDto,
  })
  @ApiBadRequestResponse(invalidRequestResponse)
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @ApiInternalServerErrorResponse(aiConfigurationResponse)
  @ApiServiceUnavailableResponse(dependencyUnavailableResponse)
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  chat(@Body() body: RagChatRequestDto): Promise<RagChatResponseDto> {
    return this.ragService.chat(body);
  }

  @ApiNoContentResponse({
    description: 'Deletes all vector index entries for the article.',
  })
  @ApiBadRequestResponse(invalidRequestResponse)
  @ApiNotFoundResponse(notFoundResponse)
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @ApiServiceUnavailableResponse(dependencyUnavailableResponse)
  @Delete('index/articles/:articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteArticleIndex(@Param('articleId', UuidParamPipe) articleId: string): Promise<void> {
    return this.ragService.deleteArticleIndex(articleId);
  }

  @ApiOkResponse({
    description: 'Returns in-memory RAG conversation history.',
    type: RagHistoryResponseDto,
  })
  @ApiBadRequestResponse(invalidRequestResponse)
  @ApiNotFoundResponse(notFoundResponse)
  @ApiTooManyRequestsResponse(rateLimitResponse)
  @Get('chat/:conversationId/history')
  getHistory(@Param('conversationId', UuidParamPipe) conversationId: string): RagHistoryResponseDto {
    return this.ragService.getHistory(conversationId);
  }
}
