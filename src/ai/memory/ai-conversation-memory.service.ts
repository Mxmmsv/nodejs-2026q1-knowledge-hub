import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationSession {
  messages: ConversationMessage[];
  expiresAt: number;
}

const sessionTtlMs = 30 * 60 * 1000;
const maxMessagesPerSession = 10;

@Injectable()
export class AiConversationMemoryService {
  private readonly sessions = new Map<string, ConversationSession>();

  getHistory(sessionId?: string, now = Date.now()): { sessionId: string; history: ConversationMessage[] } {
    const safeSessionId = sessionId ?? uuidv4();
    const session = this.sessions.get(safeSessionId);

    if (!session || session.expiresAt <= now) {
      this.sessions.set(safeSessionId, {
        messages: [],
        expiresAt: now + sessionTtlMs,
      });

      return {
        sessionId: safeSessionId,
        history: [],
      };
    }

    session.expiresAt = now + sessionTtlMs;

    return {
      sessionId: safeSessionId,
      history: [...session.messages],
    };
  }

  append(sessionId: string, userPrompt: string, assistantText: string, now = Date.now()): void {
    const session = this.sessions.get(sessionId) ?? {
      messages: [],
      expiresAt: now + sessionTtlMs,
    };

    session.messages.push(
      {
        role: 'user',
        content: userPrompt,
      },
      {
        role: 'assistant',
        content: assistantText,
      },
    );
    session.messages = session.messages.slice(-maxMessagesPerSession);
    session.expiresAt = now + sessionTtlMs;
    this.sessions.set(sessionId, session);
  }

  reset(): void {
    this.sessions.clear();
  }
}
