import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { getAuthRateLimitMax, getAuthRateLimitWindowSeconds } from './auth.utils';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly authRateLimitService: AuthRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const routePath = request.route?.path ?? request.path;
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
    const ipAddress = forwardedIp?.trim() || request.ip || 'unknown';
    const rateLimitKey = `${routePath}:${ipAddress}`;

    const isAllowed = this.authRateLimitService.consume(
      rateLimitKey,
      getAuthRateLimitMax(),
      getAuthRateLimitWindowSeconds(),
    );

    if (!isAllowed) {
      throw new HttpException(AppErrorMessages.AUTH_RATE_LIMIT_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
