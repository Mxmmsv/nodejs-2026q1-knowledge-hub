import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import {
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
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { createErrorResponse } from '../common/swagger/create-error-response';
import { CreateUserDto, UpdatePasswordDto, UserResponseDto } from './dto';
import { UserService } from './user.service';
import { toUserResponse } from './utils/to-user-response';

@ApiTags('Users')
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
  getAll(): UserResponseDto[] {
    return this.userService.findAll().map(toUserResponse);
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
  getById(@Param('id', UuidParamPipe) id: string): UserResponseDto {
    return toUserResponse(this.userService.getByIdOrThrow(id));
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
  create(@Body() createUserDto: CreateUserDto): UserResponseDto {
    return toUserResponse(this.userService.create(createUserDto));
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
  updatePassword(
    @Param('id', UuidParamPipe) id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): UserResponseDto {
    return toUserResponse(this.userService.updatePassword(id, updatePasswordDto));
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
  delete(@Param('id', UuidParamPipe) id: string): void {
    this.userService.delete(id);
  }
}
