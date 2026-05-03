import { Injectable } from '@nestjs/common';
import { Article } from '../../article/models/article.model';
import { getAiCacheTtlSeconds } from '../ai.config';
import { AiEndpoint } from '../ai.types';

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const stableStringify = (value: unknown): string => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value);
  }

  const source = value as Record<string, unknown>;

  return JSON.stringify(
    Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = source[key];
        return result;
      }, {}),
  );
};

@Injectable()
export class AiCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  createArticleKey(endpoint: AiEndpoint, article: Article, params: Record<string, unknown>): string {
    return [endpoint, article.id, article.updatedAt, stableStringify(params)].join(':');
  }

  get<T>(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, now = Date.now()): void {
    this.entries.set(key, {
      expiresAt: now + getAiCacheTtlSeconds() * 1000,
      value,
    });
  }

  reset(): void {
    this.entries.clear();
  }
}
