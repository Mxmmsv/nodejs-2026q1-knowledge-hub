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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateUserDto,
  UpdatePasswordDto,
  UserResponseDto,
} from './dto';
import { UserService } from './user.service';
import { toUserResponse } from './utils/to-user-response';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOkResponse({
    type: UserResponseDto,
    isArray: true,
  })
  @Get()
  getAll(): UserResponseDto[] {
    return this.userService.findAll().map(toUserResponse);
  }

  @ApiOkResponse({
    type: UserResponseDto,
  })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @Get(':id')
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): UserResponseDto {
    return toUserResponse(this.userService.getByIdOrThrow(id));
  }

  @ApiCreatedResponse({
    type: UserResponseDto,
  })
  @ApiBadRequestResponse()
  @Post()
  create(@Body() createUserDto: CreateUserDto): UserResponseDto {
    return toUserResponse(this.userService.create(createUserDto));
  }

  @ApiOkResponse({
    type: UserResponseDto,
  })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Put(':id')
  updatePassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): UserResponseDto {
    return toUserResponse(
      this.userService.updatePassword(id, updatePasswordDto),
    );
  }

  @ApiNoContentResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): void {
    this.userService.delete(id);
  }
}
