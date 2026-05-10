import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AppErrorMessages } from '../../../common/errors/app-error-messages';
import { AppLoggerService } from '../../../common/logger';
import { getRagVectorCollection, getRagVectorDbUrl } from '../../ai.config';
import { RagVectorPoint, RagVectorSearchFilter, RagVectorSearchHit, RagVectorPayload } from './vector-store.types';

interface QdrantResponse<T> {
  result?: T;
  status?: string;
  time?: number;
}

interface QdrantSearchPoint {
  id: string | number;
  score: number;
  payload?: RagVectorPayload;
}

interface QdrantCountResult {
  count?: number;
}

type QdrantCondition =
  | {
      key: string;
      match: {
        value: string | null;
      };
    }
  | {
      key: string;
      match: {
        any: string[];
      };
    };

interface QdrantFilter {
  must?: QdrantCondition[];
}

interface QdrantHttpResponse {
  body: string;
  ok: boolean;
  status: number;
}

const vectorDistance = 'Cosine';

@Injectable()
export class QdrantVectorStoreService {
  constructor(private readonly logger: AppLoggerService) {}

  getCollectionName(): string {
    return getRagVectorCollection();
  }

  async recreateCollection(vectorSize: number): Promise<void> {
    await this.deleteCollectionIfExists();
    await this.createCollection(vectorSize);
  }

  async ensureCollection(vectorSize: number): Promise<void> {
    const response = await this.request('GET', `/collections/${this.collectionPath()}`, undefined, [
      HttpStatus.NOT_FOUND,
    ]);

    if (response.status === HttpStatus.NOT_FOUND) {
      await this.createCollection(vectorSize);
    }
  }

  async upsert(points: RagVectorPoint[]): Promise<void> {
    if (!points.length) {
      return;
    }

    await this.ensureCollection(points[0].vector.length);
    await this.request('PUT', `/collections/${this.collectionPath()}/points?wait=true`, {
      points,
    });
  }

  async search(vector: number[], limit: number, filter: RagVectorSearchFilter = {}): Promise<RagVectorSearchHit[]> {
    const response = await this.request(
      'POST',
      `/collections/${this.collectionPath()}/points/search`,
      {
        vector,
        limit,
        with_payload: true,
        filter: this.toQdrantFilter(filter),
      },
      [HttpStatus.NOT_FOUND],
    );

    if (response.status === HttpStatus.NOT_FOUND) {
      return [];
    }

    const parsed = this.parseJson<QdrantResponse<QdrantSearchPoint[]>>(response.body);

    return (parsed.result ?? [])
      .filter((point): point is QdrantSearchPoint & { payload: RagVectorPayload } => Boolean(point.payload))
      .map((point) => ({
        id: point.id,
        score: point.score,
        payload: point.payload,
      }));
  }

  async deleteByArticleId(articleId: string): Promise<boolean> {
    const existingPoints = await this.countByArticleId(articleId);

    if (existingPoints === 0) {
      return false;
    }

    await this.request('POST', `/collections/${this.collectionPath()}/points/delete?wait=true`, {
      filter: this.toArticleIdFilter(articleId),
    });

    return true;
  }

  async deleteCollectionIfExists(): Promise<void> {
    const response = await this.request('DELETE', `/collections/${this.collectionPath()}`, undefined, [
      HttpStatus.NOT_FOUND,
    ]);

    if (response.status === HttpStatus.NOT_FOUND) {
      return;
    }
  }

  private async countByArticleId(articleId: string): Promise<number> {
    const response = await this.request(
      'POST',
      `/collections/${this.collectionPath()}/points/count`,
      {
        exact: true,
        filter: this.toArticleIdFilter(articleId),
      },
      [HttpStatus.NOT_FOUND],
    );

    if (response.status === HttpStatus.NOT_FOUND) {
      return 0;
    }

    const parsed = this.parseJson<QdrantResponse<QdrantCountResult>>(response.body);

    return parsed.result?.count ?? 0;
  }

  private async createCollection(vectorSize: number): Promise<void> {
    await this.request('PUT', `/collections/${this.collectionPath()}`, {
      vectors: {
        size: vectorSize,
        distance: vectorDistance,
      },
    });
  }

  private collectionPath(): string {
    return encodeURIComponent(getRagVectorCollection());
  }

  private toArticleIdFilter(articleId: string): QdrantFilter {
    return {
      must: [
        {
          key: 'articleId',
          match: {
            value: articleId,
          },
        },
      ],
    };
  }

  private toQdrantFilter(filter: RagVectorSearchFilter): QdrantFilter | undefined {
    const must: QdrantCondition[] = [];

    if (filter.articleStatus) {
      must.push({
        key: 'articleStatus',
        match: {
          value: filter.articleStatus,
        },
      });
    }

    if (filter.categoryId) {
      must.push({
        key: 'categoryId',
        match: {
          value: filter.categoryId,
        },
      });
    }

    for (const tag of filter.tags ?? []) {
      must.push({
        key: 'tags',
        match: {
          value: tag,
        },
      });
    }

    return must.length ? { must } : undefined;
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    allowedStatuses: number[] = [],
  ): Promise<QdrantHttpResponse> {
    const url = `${getRagVectorDbUrl()}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const responseBody = await response.text();

      if (!response.ok && !allowedStatuses.includes(response.status)) {
        this.logger.warn('Qdrant request failed', QdrantVectorStoreService.name, {
          method,
          path,
          status: response.status,
        });
        throw new HttpException(AppErrorMessages.VECTOR_DATABASE_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return {
        body: responseBody,
        ok: response.ok,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.warn('Qdrant request failed', QdrantVectorStoreService.name, {
        method,
        path,
        message: error instanceof Error ? error.message : String(error),
      });
      throw new HttpException(AppErrorMessages.VECTOR_DATABASE_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private parseJson<T>(body: string): T {
    try {
      return JSON.parse(body) as T;
    } catch (error) {
      this.logger.warn('Qdrant returned invalid JSON', QdrantVectorStoreService.name, {
        message: error instanceof Error ? error.message : String(error),
      });
      throw new HttpException(AppErrorMessages.VECTOR_DATABASE_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
