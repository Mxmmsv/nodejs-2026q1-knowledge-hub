import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ForbiddenError } from '../common/errors';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { createErrorResponse } from '../common/swagger/create-error-response';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { isAuthMode } from '../auth/auth.utils';
import { UserRole } from '../common/enums/user-role.enum';
import { CommentResponseDto, CreateCommentDto, FindCommentsQueryDto } from './dto';
import { CommentService } from './comment.service';
import { toCommentResponse } from './utils/to-comment-response';

@ApiTags('Comments')
@ApiBearerAuth('bearerAuth')
@ApiExtraModels(ErrorResponseDto)
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ApiOkResponse({
    description: 'Returns all comment records for the given article.',
    type: CommentResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if articleId query parameter is missing or invalid (not uuid).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['articleId must be a UUID'],
      },
    }),
  )
  @Get()
  async getByArticle(@Query() query: FindCommentsQueryDto): Promise<CommentResponseDto[]> {
    return (await this.commentService.findAllByArticleId(query.articleId)).map(toCommentResponse);
  }

  @ApiOkResponse({
    description: 'Returns the record with id === commentId if it exists.',
    type: CommentResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if commentId is invalid (not uuid).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid UUID',
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === commentId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Comment not found',
      },
    }),
  )
  @Get(':id')
  async getById(@Param('id', UuidParamPipe) id: string): Promise<CommentResponseDto> {
    return toCommentResponse(await this.commentService.getByIdOrThrow(id));
  }

  @ApiCreatedResponse({
    description: 'Returns the newly created record if request is valid.',
    type: CommentResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if request body does not contain required fields.',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['content should not be empty', 'articleId must be a UUID'],
      },
    }),
  )
  @ApiUnprocessableEntityResponse(
    createErrorResponse({
      description: "Returns a corresponding message if the referenced articleId doesn't exist.",
      example: {
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Article not found',
      },
    }),
  )
  @Post()
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() currentUser?: AuthUser,
  ): Promise<CommentResponseDto> {
    let payload = createCommentDto;

    if (isAuthMode()) {
      if (currentUser?.role === UserRole.VIEWER) {
        throw new ForbiddenError();
      }

      if (currentUser?.role === UserRole.EDITOR) {
        const authorId = createCommentDto.authorId ?? currentUser.userId;

        if (authorId !== currentUser.userId) {
          throw new ForbiddenError();
        }

        payload = {
          ...createCommentDto,
          authorId,
        };
      }
    }

    return toCommentResponse(await this.commentService.create(payload));
  }

  @ApiNoContentResponse({ description: 'Returns no content if the record is found and deleted.' })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if commentId is invalid (not uuid).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid UUID',
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === commentId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Comment not found',
      },
    }),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(@Param('id', UuidParamPipe) id: string, @CurrentUser() currentUser?: AuthUser): Promise<void> {
    if (isAuthMode()) {
      if (currentUser?.role === UserRole.VIEWER) {
        throw new ForbiddenError();
      }

      if (currentUser?.role === UserRole.EDITOR) {
        const comment = await this.commentService.getByIdOrThrow(id);

        if (comment.authorId !== currentUser.userId) {
          throw new ForbiddenError();
        }
      }
    }

    return this.commentService.delete(id);
  }
}
