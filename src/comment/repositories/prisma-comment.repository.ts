import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toCommentModel } from '../../prisma/mappers/prisma-record.mappers';
import { Comment } from '../models/comment.model';

@Injectable()
export class PrismaCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Comment[]> {
    const comments = await this.prisma.comment.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return comments.map(toCommentModel);
  }

  async findById(id: string): Promise<Comment | undefined> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    return comment ? toCommentModel(comment) : undefined;
  }

  async save(comment: Comment): Promise<Comment> {
    const savedComment = await this.prisma.comment.upsert({
      where: { id: comment.id },
      update: {
        content: comment.content,
        articleId: comment.articleId,
        authorId: comment.authorId,
      },
      create: {
        id: comment.id,
        content: comment.content,
        articleId: comment.articleId,
        authorId: comment.authorId,
        createdAt: new Date(comment.createdAt),
      },
    });

    return toCommentModel(savedComment);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.prisma.comment.deleteMany({
      where: { id },
    });

    return result.count > 0;
  }
}
