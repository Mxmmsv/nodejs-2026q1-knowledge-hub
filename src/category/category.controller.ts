import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
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
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { isAuthMode } from '../auth/auth.utils';
import { UserRole } from '../common/enums/user-role.enum';
import { CategoryResponseDto, CreateCategoryDto, UpdateCategoryDto } from './dto';
import { CategoryService } from './category.service';
import { toCategoryResponse } from './utils/to-category-response';

@ApiTags('Categories')
@ApiExtraModels(ErrorResponseDto)
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOkResponse({
    description: 'Returns all category records.',
    type: CategoryResponseDto,
    isArray: true,
  })
  @Get()
  async getAll(): Promise<CategoryResponseDto[]> {
    return (await this.categoryService.findAll()).map(toCategoryResponse);
  }

  @ApiOkResponse({
    description: 'Returns the record with id === categoryId if it exists.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if categoryId is invalid (not uuid).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid UUID',
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === categoryId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Category not found',
      },
    }),
  )
  @Get(':id')
  async getById(@Param('id', UuidParamPipe) id: string): Promise<CategoryResponseDto> {
    return toCategoryResponse(await this.categoryService.getByIdOrThrow(id));
  }

  @ApiCreatedResponse({
    description: 'Returns the newly created record if request is valid.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if request body does not contain required fields.',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['name should not be empty', 'description should not be empty', 'description must be a string'],
      },
    }),
  )
  @Post()
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() currentUser?: AuthUser,
  ): Promise<CategoryResponseDto> {
    if (isAuthMode() && currentUser?.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    return toCategoryResponse(await this.categoryService.create(createCategoryDto));
  }

  @ApiOkResponse({
    description: 'Returns the updated record if request is valid.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if categoryId is invalid (not uuid) or request body is invalid.',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['name should not be empty', 'description should not be empty'],
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === categoryId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Category not found',
      },
    }),
  )
  @Put(':id')
  async update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() currentUser?: AuthUser,
  ): Promise<CategoryResponseDto> {
    if (isAuthMode() && currentUser?.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    return toCategoryResponse(await this.categoryService.update(id, updateCategoryDto));
  }

  @ApiNoContentResponse({ description: 'Returns no content if the record is found and deleted.' })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if categoryId is invalid (not uuid).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid UUID',
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === categoryId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Category not found',
      },
    }),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', UuidParamPipe) id: string, @CurrentUser() currentUser?: AuthUser): Promise<void> {
    if (isAuthMode() && currentUser?.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    return this.categoryService.delete(id);
  }
}
