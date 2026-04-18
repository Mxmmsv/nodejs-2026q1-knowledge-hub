import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { AuthUser } from './auth.types';
import { getAccessTokenSecret, isAuthMode, isAuthUserPayload } from './auth.utils';
import { IS_PUBLIC_KEY } from './public.decorator';

type RequestWithUser = Request & {
  user?: AuthUser;
};

@Injectable()
export class AccessTokenAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isAuthMode()) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedException(AppErrorMessages.AUTH_ACCESS_TOKEN_REQUIRED);
    }

    if (!authorizationHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(AppErrorMessages.AUTH_BEARER_TOKEN_INVALID);
    }

    const accessToken = authorizationHeader.slice('Bearer '.length).trim();

    if (!accessToken) {
      throw new UnauthorizedException(AppErrorMessages.AUTH_ACCESS_TOKEN_REQUIRED);
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(accessToken, {
        secret: getAccessTokenSecret(),
      });

      if (!isAuthUserPayload(payload)) {
        throw new Error('Invalid payload');
      }

      request.user = payload;
    } catch {
      throw new UnauthorizedException(AppErrorMessages.AUTH_ACCESS_TOKEN_INVALID);
    }

    return true;
  }
}
