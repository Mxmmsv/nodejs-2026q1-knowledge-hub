import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { AiCommonModule } from './ai-common.module';
import { AiCacheService } from './cache/ai-cache.service';
import { GeminiModule } from './gemini/gemini.module';
import { AiConversationMemoryService } from './memory/ai-conversation-memory.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [ArticleModule, AiCommonModule, GeminiModule],
  controllers: [AiController],
  providers: [AiService, AiCacheService, AiConversationMemoryService],
})
export class AiModule {}
