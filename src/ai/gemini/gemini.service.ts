import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { AppErrorMessages } from '../../common/errors/app-error-messages';
import { AppLoggerService } from '../../common/logger';
import { getGeminiApiBaseUrl, getGeminiApiKey, getGeminiEmbeddingModel, getGeminiModel } from '../ai.config';
import {
  GeminiEmbeddingResponse,
  GeminiEmbeddingTaskType,
  GeminiGenerateResponse,
  GeminiGenerateResult,
  GeminiUsageMetadata,
} from './gemini.types';

const maxRetries = 3;
const requestTimeoutMs = 30_000;
const retryBaseDelayMs = 500;
const rateLimitRetryBaseDelayMs = 5_000;

interface GeminiHttpResponse {
  body: string;
  ok: boolean;
  retryAfterSeconds?: number;
  status: number;
}

const sleep = (delayMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayMs));

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsedValue = Number.parseInt(value ?? '', 10);

  return Number.isNaN(parsedValue) || parsedValue <= 0 ? fallback : parsedValue;
};

const parseRetryAfterSeconds = (value: string | null | string[] | undefined): number | undefined => {
  const headerValue = Array.isArray(value) ? value[0] : value;

  if (!headerValue) {
    return undefined;
  }

  const delaySeconds = Number.parseInt(headerValue, 10);

  if (Number.isFinite(delaySeconds) && delaySeconds > 0) {
    return delaySeconds;
  }

  const retryAt = Date.parse(headerValue);

  if (Number.isNaN(retryAt)) {
    return undefined;
  }

  return Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
};

const isGeminiAuthError = (statusCode: number, errorBody: string): boolean => {
  if (statusCode === HttpStatus.UNAUTHORIZED || statusCode === HttpStatus.FORBIDDEN) {
    return true;
  }

  if (statusCode !== HttpStatus.BAD_REQUEST) {
    return false;
  }

  return /api key|api_key|apikey/i.test(errorBody);
};

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
    return this.executeGeminiRequest<GeminiGenerateResult>(
      this.getGenerateContentUrl(),
      this.createGenerateRequestBody(prompt),
      (body) => this.parseGenerateResponse(JSON.parse(body) as GeminiGenerateResponse),
    );
  }

  async embedContent(text: string, taskType?: GeminiEmbeddingTaskType): Promise<number[]> {
    return this.executeGeminiRequest<number[]>(
      this.getEmbedContentUrl(),
      this.createEmbedRequestBody(text, taskType),
      (body) => this.parseEmbeddingResponse(JSON.parse(body) as GeminiEmbeddingResponse),
    );
  }

  private async executeGeminiRequest<T>(url: string, body: string, parseBody: (body: string) => T): Promise<T> {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      throw new HttpException(AppErrorMessages.AI_CONFIGURATION_INVALID, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        const response = await this.sendRequest(url, body, apiKey, controller.signal);

        clearTimeout(timeout);

        if (this.shouldRetry(response.status) && attempt < maxRetries) {
          await this.waitBeforeRetry(attempt, response.status, response.retryAfterSeconds);
          continue;
        }

        const errorBody = response.ok ? '' : response.body;

        if (isGeminiAuthError(response.status, errorBody)) {
          throw new HttpException(AppErrorMessages.AI_PROVIDER_AUTH_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (response.status === HttpStatus.TOO_MANY_REQUESTS || response.status >= 500) {
          throw new HttpException(AppErrorMessages.AI_PROVIDER_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
        }

        if (!response.ok) {
          throw new HttpException(AppErrorMessages.AI_PROVIDER_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
        }

        return parseBody(response.body);
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

  private getEmbedContentUrl(): string {
    return `${getGeminiApiBaseUrl()}/v1beta/models/${encodeURIComponent(getGeminiEmbeddingModel())}:embedContent`;
  }

  private createGenerateRequestBody(prompt: string): string {
    return JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    });
  }

  private createEmbedRequestBody(text: string, taskType?: GeminiEmbeddingTaskType): string {
    return JSON.stringify({
      model: `models/${getGeminiEmbeddingModel()}`,
      content: {
        parts: [{ text }],
      },
      ...(taskType ? { taskType } : {}),
    });
  }

  private async sendRequest(
    url: string,
    body: string,
    apiKey: string,
    signal: AbortSignal,
  ): Promise<GeminiHttpResponse> {
    try {
      return await this.sendFetchRequest(url, body, apiKey, signal);
    } catch (error) {
      this.logger.warn('Gemini fetch transport failed, retrying with node http client', GeminiService.name, {
        message: error instanceof Error ? error.message : String(error),
      });
      return this.sendNodeHttpRequest(url, body, apiKey);
    }
  }

  private async sendFetchRequest(
    url: string,
    body: string,
    apiKey: string,
    signal: AbortSignal,
  ): Promise<GeminiHttpResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body,
      signal,
    });

    return {
      body: await response.text(),
      ok: response.ok,
      retryAfterSeconds: parseRetryAfterSeconds(response.headers?.get?.('retry-after')),
      status: response.status,
    };
  }

  private sendNodeHttpRequest(url: string, body: string, apiKey: string): Promise<GeminiHttpResponse> {
    const requestUrl = new URL(url);
    const request = requestUrl.protocol === 'http:' ? httpRequest : httpsRequest;

    return new Promise((resolve, reject) => {
      const clientRequest = request(
        requestUrl,
        {
          family: 4,
          headers: {
            'Content-Length': Buffer.byteLength(body),
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          method: 'POST',
          timeout: requestTimeoutMs,
        },
        (response) => {
          const chunks: Buffer[] = [];

          response.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          response.on('end', () => {
            const status = response.statusCode ?? 0;

            resolve({
              body: Buffer.concat(chunks).toString('utf8'),
              ok: status >= 200 && status < 300,
              retryAfterSeconds: parseRetryAfterSeconds(response.headers['retry-after']),
              status,
            });
          });
        },
      );

      clientRequest.on('error', reject);
      clientRequest.on('timeout', () => {
        clientRequest.destroy(new Error('Gemini request timed out'));
      });
      clientRequest.write(body);
      clientRequest.end();
    });
  }

  private shouldRetry(statusCode: number): boolean {
    return statusCode === HttpStatus.TOO_MANY_REQUESTS || statusCode >= 500;
  }

  private async waitBeforeRetry(attempt: number, statusCode?: number, retryAfterSeconds?: number): Promise<void> {
    const baseDelayMs =
      statusCode === HttpStatus.TOO_MANY_REQUESTS
        ? parsePositiveInteger(process.env.GEMINI_RATE_LIMIT_RETRY_BASE_DELAY_MS, rateLimitRetryBaseDelayMs)
        : parsePositiveInteger(process.env.GEMINI_RETRY_BASE_DELAY_MS, retryBaseDelayMs);
    const delayMs = retryAfterSeconds ? retryAfterSeconds * 1000 : baseDelayMs * 2 ** attempt;

    this.logger.warn('Retrying Gemini request', GeminiService.name, {
      attempt: attempt + 1,
      delayMs,
      statusCode,
    });
    await sleep(delayMs);
  }

  private parseGenerateResponse(response: GeminiGenerateResponse): GeminiGenerateResult {
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

  private parseEmbeddingResponse(response: GeminiEmbeddingResponse): number[] {
    const values = response.embedding?.values?.filter((value): value is number => Number.isFinite(value));

    if (!values?.length) {
      throw new HttpException(AppErrorMessages.AI_RESPONSE_EMPTY, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return values;
  }
}
