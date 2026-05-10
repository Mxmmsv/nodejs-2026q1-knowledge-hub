import { RagConversationMessage, RagSearchResult } from '../rag.types';

const formatHistory = (history: RagConversationMessage[]): string =>
  history.length
    ? history.map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`).join('\n')
    : 'No previous messages.';

const formatSources = (sources: RagSearchResult[]): string =>
  sources
    .map(
      (source, index) => `[${index + 1}] Article: ${source.articleTitle} (${source.articleId})\nChunk: ${source.chunk}`,
    )
    .join('\n\n');

export const buildRagChatPrompt = (
  question: string,
  sources: RagSearchResult[],
  history: RagConversationMessage[],
): string => `You answer questions using only the Knowledge Hub sources below.
If the sources do not contain enough information, say that the Knowledge Hub sources do not contain enough information.
Do not invent facts and do not use outside knowledge.

Conversation history:
${formatHistory(history)}

Knowledge Hub sources:
${formatSources(sources)}

Question:
${question}

Answer with a concise grounded response.`;
