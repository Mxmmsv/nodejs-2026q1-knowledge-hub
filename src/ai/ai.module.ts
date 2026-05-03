import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { LoggerModule } from '../common/logger';
import { AiCacheService } from './cache/ai-cache.service';
import { GeminiService } from './gemini/gemini.service';
import { AiConversationMemoryService } from './memory/ai-conversation-memory.service';
import { AiRateLimitGuard } from './rate-limit/ai-rate-limit.guard';
import { AiRateLimitService } from './rate-limit/ai-rate-limit.service';
import { AiUsageService } from './usage/ai-usage.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [ArticleModule, LoggerModule],
  controllers: [AiController],
  providers: [
    AiService,
    GeminiService,
    AiCacheService,
    AiUsageService,
    AiRateLimitService,
    AiRateLimitGuard,
    AiConversationMemoryService,
  ],
})
export class AiModule {}
