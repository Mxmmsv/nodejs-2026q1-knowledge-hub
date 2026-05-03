import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AppErrorMessages } from '../../common/errors/app-error-messages';
import { AppLoggerService } from '../../common/logger';
import { getGeminiApiBaseUrl, getGeminiApiKey, getGeminiModel } from '../ai.config';
import { GeminiGenerateResponse, GeminiGenerateResult, GeminiUsageMetadata } from './gemini.types';

const maxRetries = 3;
const requestTimeoutMs = 30_000;
const retryBaseDelayMs = 100;

const sleep = (delayMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayMs));

const toTokenUsage = (usageMetadata?: GeminiUsageMetadata) => {
  if (!usageMetadata) {
    return undefined;
  }

  return {
    promptTokens: usageMetadata.promptTokenCount ?? 0,
    completionTokens: usageMetadata.candidatesTokenCount ?? 0,
    totalTokens: usageMetadata.totalTokenCount ?? 0,
  };
};

@Injectable()
export class GeminiService {
  constructor(private readonly logger: AppLoggerService) {}

  async generateContent(prompt: string): Promise<GeminiGenerateResult> {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      throw new HttpException(AppErrorMessages.AI_CONFIGURATION_INVALID, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        const response = await fetch(this.getGenerateContentUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (this.shouldRetry(response.status) && attempt < maxRetries) {
          await this.waitBeforeRetry(attempt, response.status);
          continue;
        }

        if (response.status === HttpStatus.UNAUTHORIZED || response.status === HttpStatus.FORBIDDEN) {
          throw new HttpException(AppErrorMessages.AI_PROVIDER_AUTH_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (response.status === HttpStatus.TOO_MANY_REQUESTS || response.status >= 500) {
          throw new HttpException(AppErrorMessages.AI_PROVIDER_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
        }

        if (!response.ok) {
          throw new HttpException(AppErrorMessages.AI_PROVIDER_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
        }

        return this.parseResponse((await response.json()) as GeminiGenerateResponse);
      } catch (error) {
        clearTimeout(timeout);

        if (error instanceof HttpException) {
          throw error;
        }

        if (attempt < maxRetries) {
          await this.waitBeforeRetry(attempt);
          continue;
        }

        this.logger.warn('Gemini request failed', GeminiService.name, {
          message: error instanceof Error ? error.message : String(error),
        });
        throw new HttpException(AppErrorMessages.AI_PROVIDER_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
      }
    }

    throw new HttpException(AppErrorMessages.AI_PROVIDER_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
  }

  private getGenerateContentUrl(): string {
    return `${getGeminiApiBaseUrl()}/v1beta/models/${encodeURIComponent(getGeminiModel())}:generateContent`;
  }

  private shouldRetry(statusCode: number): boolean {
    return statusCode === HttpStatus.TOO_MANY_REQUESTS || statusCode >= 500;
  }

  private async waitBeforeRetry(attempt: number, statusCode?: number): Promise<void> {
    this.logger.warn('Retrying Gemini request', GeminiService.name, {
      attempt: attempt + 1,
      statusCode,
    });
    await sleep(retryBaseDelayMs * 2 ** attempt);
  }

  private parseResponse(response: GeminiGenerateResponse): GeminiGenerateResult {
    const text =
      response.candidates
        ?.flatMap((candidate) => candidate.content?.parts ?? [])
        .map((part) => part.text)
        .filter((partText): partText is string => Boolean(partText?.trim()))
        .join('\n')
        .trim() ?? '';

    if (!text) {
      throw new HttpException(AppErrorMessages.AI_RESPONSE_EMPTY, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      text,
      usage: toTokenUsage(response.usageMetadata),
    };
  }
}
