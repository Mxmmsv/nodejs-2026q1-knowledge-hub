import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  attempts: number[];
}

export interface RateLimitResult {
  isAllowed: boolean;
  retryAfterSeconds: number;
}

@Injectable()
export class AiRateLimitService {
  private readonly entries = new Map<string, RateLimitEntry>();

  consume(key: string, limit: number, windowSeconds: number, now = Date.now()): RateLimitResult {
    const windowStart = now - windowSeconds * 1000;
    const entry = this.entries.get(key) ?? { attempts: [] };

    entry.attempts = entry.attempts.filter((attemptTimestamp) => attemptTimestamp > windowStart);

    if (entry.attempts.length >= limit) {
      const retryAfterMs = entry.attempts[0] + windowSeconds * 1000 - now;
      this.entries.set(key, entry);

      return {
        isAllowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    entry.attempts.push(now);
    this.entries.set(key, entry);

    return {
      isAllowed: true,
      retryAfterSeconds: 0,
    };
  }

  reset(): void {
    this.entries.clear();
  }
}
