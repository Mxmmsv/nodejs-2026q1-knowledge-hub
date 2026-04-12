import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { createErrorResponse } from '../common/swagger/create-error-response';
import { CreateUserDto, UserResponseDto } from '../user/dto';
import { toUserResponse } from '../user/utils/to-user-response';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, TokenPairResponseDto } from './dto';

@ApiExtraModels(ErrorResponseDto)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiCreatedResponse({
    description: 'Creates a new account.',
    type: UserResponseDto,
  })
  @ApiConflictResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if user with the same login already exists.',
      example: {
        statusCode: 409,
        error: 'Conflict',
        message: 'User already exists',
      },
    }),
  )
  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return toUserResponse(await this.authService.signup(createUserDto));
  }

  @Public()
  @ApiOkResponse({
    description: 'Returns a valid access and refresh token pair.',
    type: TokenPairResponseDto,
  })
  @ApiUnauthorizedResponse(
    createErrorResponse({
      description: 'Returns unauthorized if credentials are missing or invalid.',
      example: {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Unauthorized',
      },
    }),
  )
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<TokenPairResponseDto> {
    return this.authService.login(loginDto.login, loginDto.password);
  }

  @Public()
  @ApiOkResponse({
    description: 'Returns a refreshed access and refresh token pair.',
    type: TokenPairResponseDto,
  })
  @ApiUnauthorizedResponse(
    createErrorResponse({
      description: 'Returns unauthorized if refresh token is missing.',
      example: {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Unauthorized',
      },
    }),
  )
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body?: { refreshToken?: string }): Promise<TokenPairResponseDto> {
    return this.authService.refresh(body?.refreshToken);
  }
}
