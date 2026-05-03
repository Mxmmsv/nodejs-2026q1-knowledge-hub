import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthUser } from '../../auth/auth.types';
import { AppErrorMessages } from '../../common/errors/app-error-messages';
import { getAiRateLimitRpm } from '../ai.config';
import { AiRateLimitService } from './ai-rate-limit.service';

type RequestWithUser = Request & {
  user?: AuthUser;
};

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: AiRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();
    const result = this.rateLimitService.consume(this.getRateLimitKey(request), getAiRateLimitRpm(), 60);

    if (!result.isAllowed) {
      response.setHeader('Retry-After', String(result.retryAfterSeconds));
      throw new HttpException(AppErrorMessages.AI_RATE_LIMIT_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getRateLimitKey(request: RequestWithUser): string {
    const routePath = request.route?.path ?? request.path;
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
    const ipAddress = forwardedIp?.trim() || request.ip || 'unknown';
    const identity = request.user?.userId ?? ipAddress;

    return `${routePath}:${identity}`;
  }
}
