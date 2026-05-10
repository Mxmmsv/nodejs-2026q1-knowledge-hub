import { Module } from '@nestjs/common';
import { AiRateLimitGuard } from './rate-limit/ai-rate-limit.guard';
import { AiRateLimitService } from './rate-limit/ai-rate-limit.service';
import { AiUsageService } from './usage/ai-usage.service';

@Module({
  providers: [AiRateLimitGuard, AiRateLimitService, AiUsageService],
  exports: [AiRateLimitGuard, AiRateLimitService, AiUsageService],
})
export class AiCommonModule {}
