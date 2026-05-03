import { describe, expect, it } from 'vitest';
import { AiConversationMemoryService } from './ai-conversation-memory.service';

describe('AiConversationMemoryService', () => {
  it('creates sessions, stores bounded history, and expires old sessions', () => {
    const service = new AiConversationMemoryService();
    const first = service.getHistory(undefined, 1000);

    expect(first.sessionId).toEqual(expect.any(String));
    expect(first.history).toEqual([]);

    for (let index = 0; index < 6; index += 1) {
      service.append(first.sessionId, `prompt-${index}`, `answer-${index}`, 1000 + index);
    }

    const second = service.getHistory(first.sessionId, 2000);
    expect(second.history).toHaveLength(10);
    expect(second.history[0]).toEqual({ role: 'user', content: 'prompt-1' });

    const expired = service.getHistory(first.sessionId, 31 * 60 * 1000);
    expect(expired.history).toEqual([]);
  });
});
