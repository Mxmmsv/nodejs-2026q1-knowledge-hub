import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';

@Global()
@Module({
  providers: [
    {
      provide: AppLoggerService,
      useFactory: () => new AppLoggerService(),
    },
  ],
  exports: [AppLoggerService],
})
export class LoggerModule {}
