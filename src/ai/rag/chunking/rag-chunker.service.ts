import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Article } from '../../../article/models/article.model';
import { getRagChunkOverlap, getRagChunkSize } from '../../ai.config';
import { RagChunk } from '../rag.types';

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

@Injectable()
export class RagChunkerService {
  chunkArticle(article: Article): RagChunk[] {
    const text = this.toDocumentText(article);
    const chunkSize = getRagChunkSize();
    const configuredOverlap = getRagChunkOverlap();
    const chunkOverlap = configuredOverlap >= chunkSize ? Math.floor(chunkSize / 4) : configuredOverlap;
    const chunks = this.splitText(text, chunkSize, chunkOverlap);

    return chunks.map((chunk, chunkIndex) => ({
      articleId: article.id,
      articleTitle: article.title,
      articleStatus: article.status,
      categoryId: article.categoryId,
      tags: [...article.tags],
      articleUpdatedAt: article.updatedAt,
      chunk,
      chunkIndex,
      chunkHash: createHash('sha256').update(chunk).digest('hex'),
    }));
  }

  private toDocumentText(article: Article): string {
    return normalizeWhitespace(
      [
        `Title: ${article.title}`,
        `Status: ${article.status}`,
        `Category: ${article.categoryId ?? 'none'}`,
        `Tags: ${article.tags.join(', ') || 'none'}`,
        `Content: ${article.content}`,
      ].join('\n'),
    );
  }

  private splitText(text: string, chunkSize: number, chunkOverlap: number): string[] {
    if (!text) {
      return [];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(text.length, start + chunkSize);
      const chunk = text.slice(start, end).trim();

      if (chunk) {
        chunks.push(chunk);
      }

      if (end >= text.length) {
        break;
      }

      const nextStart = end - chunkOverlap;
      start = nextStart > start ? nextStart : end;
    }

    return chunks;
  }
}
