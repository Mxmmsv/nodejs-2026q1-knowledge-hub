import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryResponseDto, CreateCategoryDto, UpdateCategoryDto } from './dto';
import { CategoryService } from './category.service';
import { toCategoryResponse } from './utils/to-category-response';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOkResponse({
    type: CategoryResponseDto,
    isArray: true,
  })
  @Get()
  getAll(): CategoryResponseDto[] {
    return this.categoryService.findAll().map(toCategoryResponse);
  }

  @ApiOkResponse({
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @Get(':id')
  getById(@Param('id', UuidParamPipe) id: string): CategoryResponseDto {
    return toCategoryResponse(this.categoryService.getByIdOrThrow(id));
  }

  @ApiCreatedResponse({
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse()
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto): CategoryResponseDto {
    return toCategoryResponse(this.categoryService.create(createCategoryDto));
  }

  @ApiOkResponse({
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @Put(':id')
  update(@Param('id', UuidParamPipe) id: string, @Body() updateCategoryDto: UpdateCategoryDto): CategoryResponseDto {
    return toCategoryResponse(this.categoryService.update(id, updateCategoryDto));
  }

  @ApiNoContentResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', UuidParamPipe) id: string): void {
    this.categoryService.delete(id);
  }
}
