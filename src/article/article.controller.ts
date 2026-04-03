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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArticleResponseDto,
  CreateArticleDto,
  FindArticlesQueryDto,
  UpdateArticleDto,
} from './dto';
import { ArticleService } from './article.service';
import { toArticleResponse } from './utils/to-article-response';

@ApiTags('Articles')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @ApiOkResponse({
    type: ArticleResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse()
  @Get()
  getAll(
    @Query() query: FindArticlesQueryDto,
  ): ArticleResponseDto[] {
    return this.articleService.findAll(query).map(toArticleResponse);
  }

  @ApiOkResponse({
    type: ArticleResponseDto,
  })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @Get(':id')
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): ArticleResponseDto {
    return toArticleResponse(this.articleService.getByIdOrThrow(id));
  }

  @ApiCreatedResponse({
    type: ArticleResponseDto,
  })
  @ApiBadRequestResponse()
  @Post()
  create(@Body() createArticleDto: CreateArticleDto): ArticleResponseDto {
    return toArticleResponse(this.articleService.create(createArticleDto));
  }

  @ApiOkResponse({
    type: ArticleResponseDto,
  })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): ArticleResponseDto {
    return toArticleResponse(this.articleService.update(id, updateArticleDto));
  }

  @ApiNoContentResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): void {
    this.articleService.delete(id);
  }
}
