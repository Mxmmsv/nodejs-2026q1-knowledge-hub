import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { createErrorResponse } from '../common/swagger/create-error-response';
import { ArticleResponseDto, CreateArticleDto, FindArticlesQueryDto, UpdateArticleDto } from './dto';
import { ArticleService } from './article.service';
import { toArticleResponse } from './utils/to-article-response';

@ApiTags('Articles')
@ApiExtraModels(ErrorResponseDto)
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @ApiOkResponse({
    description:
      'Returns all article records. Supports optional query parameters for filtering: status, categoryId, tag.',
    type: ArticleResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if query parameters are invalid.',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['categoryId must be a UUID'],
      },
    }),
  )
  @Get()
  getAll(@Query() query: FindArticlesQueryDto): ArticleResponseDto[] {
    return this.articleService.findAll(query).map(toArticleResponse);
  }

  @ApiOkResponse({
    description: 'Returns the record with id === articleId if it exists.',
    type: ArticleResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if articleId is invalid (not uuid).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid UUID',
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === articleId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Article not found',
      },
    }),
  )
  @Get(':id')
  getById(@Param('id', UuidParamPipe) id: string): ArticleResponseDto {
    return toArticleResponse(this.articleService.getByIdOrThrow(id));
  }

  @ApiCreatedResponse({
    description: 'Returns the newly created record if request is valid.',
    type: ArticleResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if request body does not contain required fields (title, content).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: [
          'title should not be empty',
          'title must be a string',
          'content should not be empty',
          'content must be a string',
        ],
      },
    }),
  )
  @Post()
  create(@Body() createArticleDto: CreateArticleDto): ArticleResponseDto {
    return toArticleResponse(this.articleService.create(createArticleDto));
  }

  @ApiOkResponse({
    description: 'Returns the updated record if request is valid.',
    type: ArticleResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if articleId is invalid (not uuid) or request body is invalid.',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['status must be one of the following values: draft, published, archived'],
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === articleId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Article not found',
      },
    }),
  )
  @Put(':id')
  update(@Param('id', UuidParamPipe) id: string, @Body() updateArticleDto: UpdateArticleDto): ArticleResponseDto {
    return toArticleResponse(this.articleService.update(id, updateArticleDto));
  }

  @ApiNoContentResponse({ description: 'Returns no content if the record is found and deleted.' })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if articleId is invalid (not uuid).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid UUID',
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === articleId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Article not found',
      },
    }),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', UuidParamPipe) id: string): void {
    this.articleService.delete(id);
  }
}
