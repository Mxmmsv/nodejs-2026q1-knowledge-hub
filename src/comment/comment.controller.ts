import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  CommentResponseDto,
  CreateCommentDto,
  FindCommentsQueryDto,
} from './dto';
import { CommentService } from './comment.service';
import { toCommentResponse } from './utils/to-comment-response';

@ApiTags('Comments')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ApiOkResponse({
    type: CommentResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse()
  @Get()
  getByArticle(@Query() query: FindCommentsQueryDto): CommentResponseDto[] {
    return this.commentService
      .findAllByArticleId(query.articleId)
      .map(toCommentResponse);
  }

  @ApiOkResponse({
    type: CommentResponseDto,
  })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @Get(':id')
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): CommentResponseDto {
    return toCommentResponse(this.commentService.getByIdOrThrow(id));
  }

  @ApiCreatedResponse({
    type: CommentResponseDto,
  })
  @ApiBadRequestResponse()
  @ApiUnprocessableEntityResponse()
  @Post()
  create(@Body() createCommentDto: CreateCommentDto): CommentResponseDto {
    return toCommentResponse(this.commentService.create(createCommentDto));
  }

  @ApiNoContentResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    this.commentService.delete(id);
  }
}
