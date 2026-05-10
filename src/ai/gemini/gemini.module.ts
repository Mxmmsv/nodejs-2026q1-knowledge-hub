import { Module } from '@nestjs/common';
import { LoggerModule } from '../../common/logger';
import { GeminiService } from './gemini.service';

@Module({
  imports: [LoggerModule],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
