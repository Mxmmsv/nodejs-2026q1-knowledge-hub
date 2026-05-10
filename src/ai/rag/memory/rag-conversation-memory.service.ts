import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { getRagConversationMaxMessages } from '../../ai.config';
import { RagConversationMessage } from '../rag.types';

interface RagConversationSession {
  messages: RagConversationMessage[];
}

@Injectable()
export class RagConversationMemoryService {
  private readonly sessions = new Map<string, RagConversationSession>();

  getHistory(conversationId?: string): { conversationId: string; history: RagConversationMessage[] } {
    const safeConversationId = conversationId ?? uuidv4();
    const session = this.sessions.get(safeConversationId);

    if (!session) {
      this.sessions.set(safeConversationId, { messages: [] });

      return {
        conversationId: safeConversationId,
        history: [],
      };
    }

    return {
      conversationId: safeConversationId,
      history: [...session.messages],
    };
  }

  getConversation(conversationId: string): RagConversationMessage[] | undefined {
    const session = this.sessions.get(conversationId);

    return session ? [...session.messages] : undefined;
  }

  append(conversationId: string, question: string, answer: string): void {
    const session = this.sessions.get(conversationId) ?? { messages: [] };

    session.messages.push(
      {
        role: 'user',
        content: question,
      },
      {
        role: 'assistant',
        content: answer,
      },
    );
    session.messages = session.messages.slice(-getRagConversationMaxMessages());
    this.sessions.set(conversationId, session);
  }

  getMaxMessages(): number {
    return getRagConversationMaxMessages();
  }

  reset(): void {
    this.sessions.clear();
  }
}
