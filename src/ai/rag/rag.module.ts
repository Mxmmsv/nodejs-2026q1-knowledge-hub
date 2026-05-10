import { Module } from '@nestjs/common';
import { ArticleModule } from '../../article/article.module';
import { AiCommonModule } from '../ai-common.module';
import { GeminiModule } from '../gemini/gemini.module';
import { RagChunkerService } from './chunking/rag-chunker.service';
import { RagConversationMemoryService } from './memory/rag-conversation-memory.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { QdrantVectorStoreService } from './vector';

@Module({
  imports: [ArticleModule, AiCommonModule, GeminiModule],
  controllers: [RagController],
  providers: [RagService, RagChunkerService, RagConversationMemoryService, QdrantVectorStoreService],
})
export class RagModule {}
