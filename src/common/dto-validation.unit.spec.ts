import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ArticleStatus } from './enums/article-status.enum';
import { UserRole } from './enums/user-role.enum';
import { CreateArticleDto, FindArticlesQueryDto, UpdateArticleDto } from '../article/dto';
import { LoginDto, SignupDto } from '../auth/dto';
import { AnalyzeArticleDto, GenerateDto, SummarizeArticleDto, TranslateArticleDto } from '../ai/dto';
import { RagChatRequestDto, RagSearchRequestDto, ReindexRequestDto } from '../ai/rag/dto';
import { CreateCategoryDto, UpdateCategoryDto } from '../category/dto';
import { CreateCommentDto, FindCommentsQueryDto } from '../comment/dto';
import { CreateUserDto, UpdateUserDto } from '../user/dto';

const toDto = <T extends object>(DtoClass: new () => T, payload: Partial<T>): T =>
  Object.assign(new DtoClass(), payload);

const expectValid = async (dto: object): Promise<void> => {
  await expect(validate(dto)).resolves.toHaveLength(0);
};

const expectInvalid = async (dto: object): Promise<void> => {
  await expect(validate(dto)).resolves.not.toHaveLength(0);
};

describe('DTO validation', () => {
  it('rejects missing required auth and user fields', async () => {
    await expectInvalid(toDto(SignupDto, {}));
    await expectInvalid(toDto(LoginDto, { login: 'user' }));
    await expectInvalid(toDto(CreateUserDto, { password: 'secret' }));
  });

  it('accepts valid auth and user payloads', async () => {
    await expectValid(toDto(SignupDto, { login: 'user', password: 'secret' }));
    await expectValid(toDto(LoginDto, { login: 'user', password: 'secret' }));
    await expectValid(toDto(CreateUserDto, { login: 'user', password: 'secret' }));
  });

  it('validates article required fields, enum values, UUIDs, and unique tags', async () => {
    await expectInvalid(toDto(CreateArticleDto, {}));
    await expectInvalid(toDto(CreateArticleDto, { title: 'A', content: 'B', status: 'invalid' as ArticleStatus }));
    await expectInvalid(toDto(CreateArticleDto, { title: 'A', content: 'B', authorId: 'bad-uuid' }));
    await expectInvalid(toDto(CreateArticleDto, { title: 'A', content: 'B', tags: ['node', 'node'] }));
    await expectValid(
      toDto(CreateArticleDto, {
        title: 'A',
        content: 'B',
        status: ArticleStatus.DRAFT,
        authorId: '11111111-1111-4111-8111-111111111111',
        categoryId: null,
        tags: ['node'],
      }),
    );
  });

  it('validates article update and query DTOs', async () => {
    await expectInvalid(toDto(UpdateArticleDto, { status: 'invalid' as ArticleStatus }));
    await expectInvalid(toDto(FindArticlesQueryDto, { categoryId: 'bad-uuid' }));
    await expectValid(toDto(UpdateArticleDto, { status: ArticleStatus.PUBLISHED, tags: ['api'] }));
    await expectValid(
      toDto(FindArticlesQueryDto, {
        status: ArticleStatus.ARCHIVED,
        categoryId: '11111111-1111-4111-8111-111111111111',
        tag: 'node',
      }),
    );
  });

  it('validates category DTOs', async () => {
    await expectInvalid(toDto(CreateCategoryDto, { name: 'Node' }));
    await expectInvalid(toDto(UpdateCategoryDto, { description: 'Runtime' }));
    await expectValid(toDto(CreateCategoryDto, { name: 'Node', description: 'Runtime' }));
    await expectValid(toDto(UpdateCategoryDto, { name: 'Node', description: 'Updated runtime' }));
  });

  it('validates comment DTOs', async () => {
    await expectInvalid(toDto(CreateCommentDto, { content: 'Comment', articleId: 'bad-uuid' }));
    await expectInvalid(toDto(FindCommentsQueryDto, {}));
    await expectValid(
      toDto(CreateCommentDto, {
        content: 'Comment',
        articleId: '11111111-1111-4111-8111-111111111111',
        authorId: null,
      }),
    );
    await expectValid(toDto(FindCommentsQueryDto, { articleId: '11111111-1111-4111-8111-111111111111' }));
  });

  it('validates user role and password update modes', async () => {
    await expectInvalid(toDto(UpdateUserDto, { oldPassword: 'old' }));
    await expectInvalid(toDto(UpdateUserDto, { role: 'owner' as UserRole }));
    await expectValid(toDto(UpdateUserDto, { oldPassword: 'old', newPassword: 'new' }));
    await expectValid(toDto(UpdateUserDto, { role: UserRole.ADMIN }));
  });

  it('validates AI DTOs and defaults', async () => {
    await expectValid(toDto(SummarizeArticleDto, {}));
    await expectInvalid(toDto(SummarizeArticleDto, { maxLength: 'tiny' as never }));
    await expectInvalid(toDto(TranslateArticleDto, {}));
    await expectInvalid(toDto(TranslateArticleDto, { targetLanguage: '' }));
    await expectValid(toDto(TranslateArticleDto, { targetLanguage: 'Spanish' }));
    await expectValid(toDto(AnalyzeArticleDto, {}));
    await expectInvalid(toDto(AnalyzeArticleDto, { task: 'rewrite' as never }));
    await expectInvalid(toDto(GenerateDto, {}));
    await expectInvalid(toDto(GenerateDto, { prompt: 'Hi', sessionId: 'bad-id' }));
    await expectValid(toDto(GenerateDto, { prompt: 'Hi' }));
  });

  it('validates RAG DTOs and defaults', async () => {
    await expectValid(toDto(ReindexRequestDto, {}));
    await expectInvalid(toDto(ReindexRequestDto, { articleIds: ['bad-id'] }));
    await expectValid(
      toDto(ReindexRequestDto, { articleIds: ['11111111-1111-4111-8111-111111111111'], onlyPublished: false }),
    );

    await expectInvalid(toDto(RagSearchRequestDto, {}));
    await expectInvalid(toDto(RagSearchRequestDto, { query: '', limit: 5 }));
    await expectInvalid(toDto(RagSearchRequestDto, { query: 'Node', limit: 21 }));
    await expectInvalid(toDto(RagSearchRequestDto, { query: 'Node', articleStatus: 'private' as never }));
    await expectValid(
      toDto(RagSearchRequestDto, {
        query: 'Node',
        limit: 5,
        articleStatus: ArticleStatus.PUBLISHED,
        categoryId: '11111111-1111-4111-8111-111111111111',
        tags: ['node'],
      }),
    );

    await expectInvalid(toDto(RagChatRequestDto, {}));
    await expectInvalid(toDto(RagChatRequestDto, { question: '', conversationId: 'bad-id' }));
    await expectValid(toDto(RagChatRequestDto, { question: 'What is indexed?' }));
  });
});
