import { UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArticleService } from '../article/article.service';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { NotFoundError } from '../common/errors';
import { Comment } from './models/comment.model';
import { CommentRepository } from './repositories/comment.repository';
import { CommentService } from './comment.service';

const commentFixture = (overrides: Partial<Comment> = {}): Comment => ({
  id: '11111111-1111-4111-8111-111111111111',
  content: 'Comment',
  articleId: '22222222-2222-4222-8222-222222222222',
  authorId: null,
  createdAt: 1000,
  ...overrides,
});

describe('CommentService', () => {
  let service: CommentService;
  let articleService: {
    findById: ReturnType<typeof vi.fn>;
  };
  let commentRepository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    articleService = {
      findById: vi.fn(),
    };
    commentRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(async (comment: Comment) => comment),
      remove: vi.fn(async () => true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: ArticleService,
          useValue: articleService,
        },
        {
          provide: CommentRepository,
          useValue: commentRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(CommentService);
  });

  it('filters comments by article id', async () => {
    const targetComment = commentFixture({ id: 'comment-1', articleId: 'article-1' });
    commentRepository.findAll.mockResolvedValue([
      targetComment,
      commentFixture({ id: 'comment-2', articleId: 'article-2' }),
    ]);

    await expect(service.findAllByArticleId('article-1')).resolves.toEqual([targetComment]);
  });

  it('throws when comment is not found', async () => {
    commentRepository.findById.mockResolvedValue(undefined);

    await expect(service.getByIdOrThrow('missing')).rejects.toThrow(
      new NotFoundError(AppErrorMessages.COMMENT_NOT_FOUND),
    );
  });

  it('creates comments with nullable author when article exists', async () => {
    articleService.findById.mockResolvedValue({ id: 'article-id' });

    await service.create({ content: 'Text', articleId: 'article-id' });

    expect(commentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        content: 'Text',
        articleId: 'article-id',
        authorId: null,
        createdAt: expect.any(Number),
      }),
    );
  });

  it('rejects comment creation for missing articles', async () => {
    articleService.findById.mockResolvedValue(undefined);

    await expect(service.create({ content: 'Text', articleId: 'missing' })).rejects.toThrow(
      new UnprocessableEntityException(AppErrorMessages.ARTICLE_NOT_FOUND),
    );
    expect(commentRepository.save).not.toHaveBeenCalled();
  });

  it('checks existence before delete', async () => {
    commentRepository.findById.mockResolvedValue(commentFixture());

    await service.delete('comment-id');

    expect(commentRepository.remove).toHaveBeenCalledWith('comment-id');
  });
});
