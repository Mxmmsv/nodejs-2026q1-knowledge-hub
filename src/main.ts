import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppLoggerService } from './common/logger';
import { registerProcessErrorHandlers } from './common/process/process-error-handlers';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLoggerService);
  const port = Number.parseInt(process.env.PORT ?? '4000', 10);

  app.useLogger(logger);
  app.flushLogs();
  registerProcessErrorHandlers(app, logger);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Knowledge Hub')
    .setDescription('Knowledge hub service for managing articles, categories, and comments')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Paste the application accessToken value returned by POST /auth/login. Do not use GEMINI_API_KEY here.',
      },
      'bearerAuth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('doc', app, swaggerDocument);

  await app.listen(Number.isNaN(port) || port <= 0 ? 4000 : port);
}

void bootstrap();
