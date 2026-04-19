import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { createErrorResponse } from '../common/swagger/create-error-response';
import { UserResponseDto } from '../user/dto';
import { toUserResponse } from '../user/utils/to-user-response';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenBodyDto, SignupDto, TokenPairResponseDto } from './dto';

@ApiExtraModels(ErrorResponseDto)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @ApiCreatedResponse({
    description: 'Creates a new account.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns a corresponding message if dto is invalid or login is already taken.',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'User already exists',
      },
    }),
  )
  @ApiTooManyRequestsResponse(
    createErrorResponse({
      description: 'Returns too many requests if the signup limit is exceeded.',
      example: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many authentication attempts, please try again later',
      },
    }),
  )
  @Post('signup')
  async signup(@Body() signupDto: SignupDto): Promise<UserResponseDto> {
    return toUserResponse(await this.authService.signup(signupDto));
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @ApiOkResponse({
    description: 'Returns a valid access and refresh token pair.',
    type: TokenPairResponseDto,
  })
  @ApiBadRequestResponse(
    createErrorResponse({
      description: 'Returns bad request if dto is invalid.',
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['login should not be empty', 'password should not be empty'],
      },
    }),
  )
  @ApiForbiddenResponse(
    createErrorResponse({
      description: 'Returns forbidden if credentials are invalid.',
      example: {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Invalid login or password',
      },
    }),
  )
  @ApiTooManyRequestsResponse(
    createErrorResponse({
      description: 'Returns too many requests if the login limit is exceeded.',
      example: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many authentication attempts, please try again later',
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
  @ApiBody({
    type: RefreshTokenBodyDto,
  })
  @ApiUnauthorizedResponse(
    createErrorResponse({
      description: 'Returns unauthorized if refresh token is missing.',
      example: {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Refresh token is required',
      },
    }),
  )
  @ApiForbiddenResponse(
    createErrorResponse({
      description: 'Returns forbidden if refresh token is invalid, expired, or revoked.',
      example: {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Refresh token is invalid or expired',
      },
    }),
  )
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body?: Record<string, unknown>): Promise<TokenPairResponseDto> {
    return this.authService.refresh(body?.refreshToken);
  }

  @Public()
  @ApiNoContentResponse({
    description: 'Revokes the provided refresh token.',
  })
  @ApiBody({
    type: RefreshTokenBodyDto,
  })
  @ApiUnauthorizedResponse(
    createErrorResponse({
      description: 'Returns unauthorized if refresh token is missing.',
      example: {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Refresh token is required',
      },
    }),
  )
  @ApiForbiddenResponse(
    createErrorResponse({
      description: 'Returns forbidden if refresh token is invalid, expired, or revoked.',
      example: {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Refresh token is invalid or expired',
      },
    }),
  )
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body?: Record<string, unknown>): Promise<void> {
    await this.authService.logout(body?.refreshToken);
  }
}
