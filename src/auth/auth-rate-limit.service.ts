import { Injectable } from '@nestjs/common';

type AuthRateLimitEntry = {
  attempts: number[];
};

@Injectable()
export class AuthRateLimitService {
  private readonly entries = new Map<string, AuthRateLimitEntry>();

  consume(key: string, limit: number, windowSeconds: number, now = Date.now()): boolean {
    const windowStart = now - windowSeconds * 1000;
    const entry = this.entries.get(key) ?? { attempts: [] };

    entry.attempts = entry.attempts.filter((attemptTimestamp) => attemptTimestamp > windowStart);

    if (entry.attempts.length >= limit) {
      this.entries.set(key, entry);
      return false;
    }

    entry.attempts.push(now);
    this.entries.set(key, entry);
    return true;
  }

  reset(): void {
    this.entries.clear();
  }
}
