import { HttpException, HttpStatus } from '@nestjs/common';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorMessages } from '../../common/errors/app-error-messages';
import { GeminiEmbeddingTaskType } from './gemini.types';
import { GeminiService } from './gemini.service';

const createFetchResponse = (status: number, body: Record<string, unknown> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(async () => body),
    text: vi.fn(async () => JSON.stringify(body)),
  }) as unknown as Response;

describe('GeminiService', () => {
  let logger: {
    warn: ReturnType<typeof vi.fn>;
  };
  let service: GeminiService;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'unit-key';
    process.env.GEMINI_API_BASE_URL = 'https://example.com';
    process.env.GEMINI_MODEL = 'gemini-2.0-flash';
    process.env.GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
    logger = {
      warn: vi.fn(),
    };
    service = new GeminiService(logger as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_BASE_URL;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_EMBEDDING_MODEL;
  });

  it('calls Gemini over HTTP and parses text and usage metadata', async () => {
    const fetchMock = vi.fn(async () =>
      createFetchResponse(200, {
        candidates: [
          {
            content: {
              parts: [{ text: 'Result' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 2,
          candidatesTokenCount: 3,
          totalTokenCount: 5,
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.generateContent('Prompt')).resolves.toEqual({
      text: 'Result',
      usage: {
        promptTokens: 2,
        completionTokens: 3,
        totalTokens: 5,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/v1beta/models/gemini-2.0-flash:generateContent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-goog-api-key': 'unit-key',
        }),
      }),
    );
  });

  it('rejects missing API key without calling fetch', async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.generateContent('Prompt')).rejects.toThrow(
      new HttpException(AppErrorMessages.AI_CONFIGURATION_INVALID, HttpStatus.INTERNAL_SERVER_ERROR),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls Gemini embeddings endpoint and parses vector values', async () => {
    const fetchMock = vi.fn(async () =>
      createFetchResponse(200, {
        embedding: {
          values: [0.1, 0.2, 0.3],
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.embedContent('Search query', GeminiEmbeddingTaskType.RETRIEVAL_QUERY)).resolves.toEqual([
      0.1, 0.2, 0.3,
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/v1beta/models/text-embedding-004:embedContent',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text: 'Search query' }],
          },
          taskType: GeminiEmbeddingTaskType.RETRIEVAL_QUERY,
        }),
      }),
    );
  });

  it('rejects empty embedding responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => createFetchResponse(200, { embedding: { values: [] } })),
    );

    await expect(service.embedContent('Prompt')).rejects.toThrow(
      new HttpException(AppErrorMessages.AI_RESPONSE_EMPTY, HttpStatus.SERVICE_UNAVAILABLE),
    );
  });

  it('maps auth failures to safe internal errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => createFetchResponse(403)),
    );

    await expect(service.generateContent('Prompt')).rejects.toThrow(
      new HttpException(AppErrorMessages.AI_PROVIDER_AUTH_FAILED, HttpStatus.INTERNAL_SERVER_ERROR),
    );
  });

  it('maps invalid API key error bodies to safe internal errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createFetchResponse(400, {
          error: {
            status: 'INVALID_ARGUMENT',
            message: 'API key not valid. Please pass a valid API key.',
          },
        }),
      ),
    );

    await expect(service.generateContent('Prompt')).rejects.toThrow(
      new HttpException(AppErrorMessages.AI_PROVIDER_AUTH_FAILED, HttpStatus.INTERNAL_SERVER_ERROR),
    );
  });

  it('retries transient failures and returns the later success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createFetchResponse(429))
      .mockResolvedValueOnce(createFetchResponse(200, { candidates: [{ content: { parts: [{ text: 'OK' }] } }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.generateContent('Prompt')).resolves.toEqual({
      text: 'OK',
      usage: undefined,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'Retrying Gemini request',
      GeminiService.name,
      expect.objectContaining({ statusCode: 429 }),
    );
  });

  it('falls back to node http client when fetch transport fails', async () => {
    const server = await new Promise<Server>((resolve) => {
      const httpServer = createServer((_request, response) => {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Fallback OK' }] } }] }));
      });

      httpServer.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    const address = server.address() as AddressInfo;

    process.env.GEMINI_API_BASE_URL = `http://127.0.0.1:${address.port}`;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('fetch unavailable'))),
    );

    try {
      await expect(service.generateContent('Prompt')).resolves.toEqual({
        text: 'Fallback OK',
        usage: undefined,
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('maps network failures to service unavailable after retries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    );

    await expect(service.generateContent('Prompt')).rejects.toThrow(
      new HttpException(AppErrorMessages.AI_PROVIDER_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE),
    );
  });

  it('rejects empty Gemini responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => createFetchResponse(200, { candidates: [] })),
    );

    await expect(service.generateContent('Prompt')).rejects.toThrow(
      new HttpException(AppErrorMessages.AI_RESPONSE_EMPTY, HttpStatus.SERVICE_UNAVAILABLE),
    );
  });
});
