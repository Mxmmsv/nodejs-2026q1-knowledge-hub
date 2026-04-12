import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthUser } from './auth.types';
import { isAuthMode } from './auth.utils';
import { IS_PUBLIC_KEY } from './public.decorator';

type RequestWithUser = Request & {
  user?: AuthUser;
};

@Injectable()
export class TestModeAuthGuard implements CanActivate {
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

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const accessToken = authorizationHeader.slice('Bearer '.length).trim();

    if (!accessToken) {
      throw new UnauthorizedException();
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthUser>(accessToken, {
        secret: process.env.JWT_SECRET_KEY,
      });
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }
}
