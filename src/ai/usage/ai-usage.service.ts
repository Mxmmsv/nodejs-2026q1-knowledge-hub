import { Injectable } from '@nestjs/common';
import { AiEndpoint, AiTokenUsage } from '../ai.types';

@Injectable()
export class AiUsageService {
  private readonly startedAt = new Date();
  private totalRequests = 0;
  private readonly requestsByEndpoint = new Map<string, number>();
  private readonly tokenUsage: AiTokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  private latencyCount = 0;
  private latencyTotalMs = 0;
  private latencyMaxMs = 0;
  private latencyLastMs = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  recordRequest(endpoint: AiEndpoint, latencyMs: number, usage?: AiTokenUsage): void {
    this.totalRequests += 1;
    this.requestsByEndpoint.set(endpoint, (this.requestsByEndpoint.get(endpoint) ?? 0) + 1);
    this.latencyCount += 1;
    this.latencyTotalMs += latencyMs;
    this.latencyMaxMs = Math.max(this.latencyMaxMs, latencyMs);
    this.latencyLastMs = latencyMs;

    if (usage) {
      this.tokenUsage.promptTokens += usage.promptTokens;
      this.tokenUsage.completionTokens += usage.completionTokens;
      this.tokenUsage.totalTokens += usage.totalTokens;
    }
  }

  recordCacheHit(): void {
    this.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.cacheMisses += 1;
  }

  getUsage() {
    const cacheTotal = this.cacheHits + this.cacheMisses;

    return {
      startedAt: this.startedAt.toISOString(),
      totalRequests: this.totalRequests,
      requestsByEndpoint: Object.fromEntries(this.requestsByEndpoint),
      tokenUsage: { ...this.tokenUsage },
      latencyMs: {
        count: this.latencyCount,
        averageMs: this.latencyCount === 0 ? 0 : Math.round(this.latencyTotalMs / this.latencyCount),
        maxMs: this.latencyMaxMs,
        lastMs: this.latencyLastMs,
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRatio: cacheTotal === 0 ? 0 : Number((this.cacheHits / cacheTotal).toFixed(2)),
      },
    };
  }

  reset(): void {
    this.totalRequests = 0;
    this.requestsByEndpoint.clear();
    this.tokenUsage.promptTokens = 0;
    this.tokenUsage.completionTokens = 0;
    this.tokenUsage.totalTokens = 0;
    this.latencyCount = 0;
    this.latencyTotalMs = 0;
    this.latencyMaxMs = 0;
    this.latencyLastMs = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}
