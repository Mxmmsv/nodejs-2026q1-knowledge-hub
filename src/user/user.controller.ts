import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ForbiddenError, ValidationError } from '../common/errors';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { createErrorResponse } from '../common/swagger/create-error-response';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { isAuthMode, isTestLogin } from '../auth/auth.utils';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { UserService } from './user.service';
import { toUserResponse } from './utils/to-user-response';

@ApiTags('Users')
@ApiBearerAuth('bearerAuth')
@ApiExtraModels(ErrorResponseDto)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOkResponse({
    description: 'Returns all user records.',
    type: UserResponseDto,
    isArray: true,
  })
  @Get()
  async getAll(): Promise<UserResponseDto[]> {
    return (await this.userService.findAll()).map(toUserResponse);
  }

  @ApiOkResponse({
    description: 'Returns the record with id === userId if it exists.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if userId is invalid (not uuid).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid UUID',
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === userId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      },
    }),
  )
  @Get(':id')
  async getById(@Param('id', UuidParamPipe) id: string): Promise<UserResponseDto> {
    return toUserResponse(await this.userService.getByIdOrThrow(id));
  }

  @ApiCreatedResponse({
    description: 'Returns the newly created record if request is valid.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if request body does not contain required fields.',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['login should not be empty', 'password should not be empty', 'password must be a string'],
      },
    }),
  )
  @Post()
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser?: AuthUser): Promise<UserResponseDto> {
    if (isAuthMode() && currentUser?.role !== UserRole.ADMIN) {
      throw new ForbiddenError();
    }

    if (isTestLogin(createUserDto.login)) {
      await this.userService.removeByLoginIfExists(createUserDto.login);
    }

    return toUserResponse(await this.userService.create(createUserDto));
  }

  @ApiOkResponse({
    description: 'Returns the updated record if request is valid.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if userId is invalid (not uuid) or request body is invalid.',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['oldPassword should not be empty', 'newPassword should not be empty'],
      },
    }),
  )
  @ApiForbiddenResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if oldPassword is wrong.',
      example: {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Old password is incorrect',
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === userId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      },
    }),
  )
  @Put(':id')
  async updatePassword(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser?: AuthUser,
  ): Promise<UserResponseDto> {
    if (updateUserDto.role !== undefined) {
      if (!isAuthMode()) {
        throw new ValidationError('Role updates are available only in auth mode');
      }

      if (currentUser?.role !== UserRole.ADMIN) {
        throw new ForbiddenError();
      }

      return toUserResponse(await this.userService.updateRole(id, updateUserDto.role));
    }

    if (isAuthMode() && currentUser?.role !== UserRole.ADMIN && currentUser?.userId !== id) {
      throw new ForbiddenError();
    }

    return toUserResponse(await this.userService.updatePassword(id, updateUserDto));
  }

  @ApiNoContentResponse({ description: 'Returns no content if the record is found and deleted.' })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if userId is invalid (not uuid).',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid UUID',
      },
    }),
  )
  @ApiNotFoundResponse(
    createErrorResponse({
      description: "Returns a corresponding message if record with id === userId doesn't exist.",
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      },
    }),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', UuidParamPipe) id: string, @CurrentUser() currentUser?: AuthUser): Promise<void> {
    if (isAuthMode() && currentUser?.role !== UserRole.ADMIN) {
      throw new ForbiddenError();
    }

    return this.userService.delete(id);
  }
}
