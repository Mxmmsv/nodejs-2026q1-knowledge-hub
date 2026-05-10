import { ApiProperty } from '@nestjs/swagger';

export class RagSearchResultDto {
  @ApiProperty({ format: 'uuid' })
  articleId: string;

  @ApiProperty()
  articleTitle: string;

  @ApiProperty()
  chunk: string;

  @ApiProperty()
  similarity: number;
}

export class RagSearchResponseDto {
  @ApiProperty({ type: RagSearchResultDto, isArray: true })
  results: RagSearchResultDto[];
}

export class RagSourceDto {
  @ApiProperty({ format: 'uuid' })
  articleId: string;

  @ApiProperty()
  articleTitle: string;

  @ApiProperty()
  relevantChunk: string;
}

export class RagChatResponseDto {
  @ApiProperty()
  answer: string;

  @ApiProperty({ type: RagSourceDto, isArray: true })
  sources: RagSourceDto[];

  @ApiProperty({ format: 'uuid' })
  conversationId: string;
}

export class RagConversationMessageDto {
  @ApiProperty({
    enum: ['user', 'assistant'],
  })
  role: 'user' | 'assistant';

  @ApiProperty()
  content: string;
}

export class RagHistoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  conversationId: string;

  @ApiProperty({ type: RagConversationMessageDto, isArray: true })
  messages: RagConversationMessageDto[];

  @ApiProperty()
  maxMessages: number;
}
