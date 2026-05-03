import { ConversationMessage } from '../memory/ai-conversation-memory.service';

export const buildGeneratePrompt = (
  prompt: string,
  history: ConversationMessage[],
  systemInstruction?: string,
): string => {
  const historyText = history
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n');

  return `
${systemInstruction ? `System instruction: ${systemInstruction}\n` : ''}Answer the user request.
${historyText ? `\nConversation context:\n${historyText}\n` : ''}
User request:
${prompt}
`.trim();
};
