import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../app.controller';
import { ArticleController } from '../article/article.controller';
import { ArticleService } from '../article/article.service';
import { ArticleStatus } from './enums/article-status.enum';
import { UserRole } from './enums/user-role.enum';
import { ForbiddenError, ValidationError } from './errors';
import { AuthUser } from '../auth/auth.types';
import { CategoryController } from '../category/category.controller';
import { CategoryService } from '../category/category.service';
import { CommentController } from '../comment/comment.controller';
import { CommentService } from '../comment/comment.service';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';

const adminUser: AuthUser = {
  userId: 'admin-id',
  login: 'admin',
  role: UserRole.ADMIN,
};

const editorUser: AuthUser = {
  userId: 'editor-id',
  login: 'editor',
  role: UserRole.EDITOR,
};

const viewerUser: AuthUser = {
  userId: 'viewer-id',
  login: 'viewer',
  role: UserRole.VIEWER,
};

const articleFixture = (overrides: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Article',
  content: 'Content',
  status: ArticleStatus.DRAFT,
  authorId: null,
  categoryId: null,
  tags: [],
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

const userFixture = (overrides: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  login: 'user',
  password: 'hashed-password',
  role: UserRole.VIEWER,
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

const categoryFixture = (overrides: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Category',
  description: 'Description',
  ...overrides,
});

const commentFixture = (overrides: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  content: 'Comment',
  articleId: '22222222-2222-4222-8222-222222222222',
  authorId: null,
  createdAt: 1000,
  ...overrides,
});

describe('AppController', () => {
  it('returns the API root message', () => {
    expect(new AppController().getRoot()).toEqual({ message: 'Knowledge Hub API' });
  });
});

describe('ArticleController', () => {
  let controller: ArticleController;
  let articleService: {
    findAll: ReturnType<typeof vi.fn>;
    getByIdOrThrow: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    articleService = {
      findAll: vi.fn(async () => [articleFixture()]),
      getByIdOrThrow: vi.fn(async () => articleFixture()),
      create: vi.fn(async (payload) => articleFixture(payload)),
      update: vi.fn(async (_id, payload) => articleFixture(payload)),
      delete: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [
        {
          provide: ArticleService,
          useValue: articleService,
        },
      ],
    }).compile();

    controller = moduleRef.get(ArticleController);
  });

  it('maps list and detail responses', async () => {
    await expect(controller.getAll({ status: ArticleStatus.DRAFT })).resolves.toEqual([
      expect.objectContaining({ title: 'Article', tags: [] }),
    ]);
    await expect(controller.getById('article-id')).resolves.toEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );
  });

  it('enforces create RBAC and assigns editor authorship', async () => {
    process.env.TEST_MODE = 'auth';

    await expect(controller.create({ title: 'A', content: 'B' }, viewerUser)).rejects.toThrow(ForbiddenError);

    await controller.create({ title: 'A', content: 'B' }, editorUser);
    expect(articleService.create).toHaveBeenCalledWith({
      title: 'A',
      content: 'B',
      authorId: editorUser.userId,
    });

    await expect(controller.create({ title: 'A', content: 'B', authorId: 'other-user' }, editorUser)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('enforces update ownership and strips authorId from update payloads', async () => {
    process.env.TEST_MODE = 'auth';
    articleService.getByIdOrThrow.mockResolvedValue(articleFixture({ authorId: 'other-user' }));

    await expect(controller.update('article-id', { title: 'A' }, editorUser)).rejects.toThrow(ForbiddenError);

    await controller.update('article-id', { title: 'A', authorId: 'attacker-id' }, adminUser);

    expect(articleService.update).toHaveBeenCalledWith('article-id', { title: 'A' });
  });

  it('enforces delete RBAC', async () => {
    process.env.TEST_MODE = 'auth';

    expect(() => controller.delete('article-id', viewerUser)).toThrow(ForbiddenError);
    await controller.delete('article-id', adminUser);

    expect(articleService.delete).toHaveBeenCalledWith('article-id');
  });
});

describe('UserController', () => {
  let controller: UserController;
  let userService: {
    findAll: ReturnType<typeof vi.fn>;
    getByIdOrThrow: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    removeByLoginIfExists: ReturnType<typeof vi.fn>;
    updateRole: ReturnType<typeof vi.fn>;
    updatePassword: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    userService = {
      findAll: vi.fn(async () => [userFixture()]),
      getByIdOrThrow: vi.fn(async () => userFixture()),
      create: vi.fn(async (payload) => userFixture(payload)),
      removeByLoginIfExists: vi.fn(),
      updateRole: vi.fn(async (_id, role) => userFixture({ role })),
      updatePassword: vi.fn(async (_id, payload) => userFixture(payload)),
      delete: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    controller = moduleRef.get(UserController);
  });

  it('strips password fields from user responses', async () => {
    const [user] = await controller.getAll();
    const detail = await controller.getById('user-id');

    expect(user).not.toHaveProperty('password');
    expect(detail).not.toHaveProperty('password');
  });

  it('enforces create RBAC and cleans repeated test users', async () => {
    process.env.TEST_MODE = 'auth';

    await expect(controller.create({ login: 'new-user', password: 'secret' }, viewerUser)).rejects.toThrow(
      ForbiddenError,
    );
    await controller.create({ login: 'TEST_new-user', password: 'secret' }, adminUser);

    expect(userService.removeByLoginIfExists).toHaveBeenCalledWith('TEST_new-user');
    expect(userService.create).toHaveBeenCalledWith({ login: 'TEST_new-user', password: 'secret' });
  });

  it('handles role and password updates with auth constraints', async () => {
    await expect(controller.updatePassword('user-id', { role: UserRole.ADMIN })).rejects.toThrow(ValidationError);

    process.env.TEST_MODE = 'auth';

    await expect(controller.updatePassword('user-id', { role: UserRole.ADMIN }, viewerUser)).rejects.toThrow(
      ForbiddenError,
    );
    await controller.updatePassword('user-id', { role: UserRole.ADMIN }, adminUser);
    await expect(
      controller.updatePassword('other-user-id', { oldPassword: 'old', newPassword: 'new' }, viewerUser),
    ).rejects.toThrow(ForbiddenError);
    await controller.updatePassword(viewerUser.userId, { oldPassword: 'old', newPassword: 'new' }, viewerUser);

    expect(userService.updateRole).toHaveBeenCalledWith('user-id', UserRole.ADMIN);
    expect(userService.updatePassword).toHaveBeenCalledWith(viewerUser.userId, {
      oldPassword: 'old',
      newPassword: 'new',
    });
  });

  it('enforces delete RBAC', async () => {
    process.env.TEST_MODE = 'auth';

    expect(() => controller.delete('user-id', viewerUser)).toThrow(ForbiddenError);
    await controller.delete('user-id', adminUser);

    expect(userService.delete).toHaveBeenCalledWith('user-id');
  });
});

describe('CategoryController', () => {
  let controller: CategoryController;
  let categoryService: {
    findAll: ReturnType<typeof vi.fn>;
    getByIdOrThrow: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    categoryService = {
      findAll: vi.fn(async () => [categoryFixture()]),
      getByIdOrThrow: vi.fn(async () => categoryFixture()),
      create: vi.fn(async (payload) => categoryFixture(payload)),
      update: vi.fn(async (_id, payload) => categoryFixture(payload)),
      delete: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: categoryService,
        },
      ],
    }).compile();

    controller = moduleRef.get(CategoryController);
  });

  it('maps list and detail responses', async () => {
    await expect(controller.getAll()).resolves.toEqual([categoryFixture()]);
    await expect(controller.getById('category-id')).resolves.toEqual(categoryFixture());
  });

  it('enforces admin-only mutations in auth mode', async () => {
    process.env.TEST_MODE = 'auth';

    await expect(controller.create({ name: 'Node', description: 'Runtime' }, viewerUser)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(
      controller.update('category-id', { name: 'Node', description: 'Runtime' }, viewerUser),
    ).rejects.toThrow(ForbiddenError);
    expect(() => controller.delete('category-id', viewerUser)).toThrow(ForbiddenError);

    await controller.create({ name: 'Node', description: 'Runtime' }, adminUser);
    await controller.update('category-id', { name: 'Node', description: 'Runtime' }, adminUser);
    await controller.delete('category-id', adminUser);

    expect(categoryService.create).toHaveBeenCalled();
    expect(categoryService.update).toHaveBeenCalled();
    expect(categoryService.delete).toHaveBeenCalledWith('category-id');
  });
});

describe('CommentController', () => {
  let controller: CommentController;
  let commentService: {
    findAllByArticleId: ReturnType<typeof vi.fn>;
    getByIdOrThrow: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    commentService = {
      findAllByArticleId: vi.fn(async () => [commentFixture()]),
      getByIdOrThrow: vi.fn(async () => commentFixture()),
      create: vi.fn(async (payload) => commentFixture(payload)),
      delete: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        {
          provide: CommentService,
          useValue: commentService,
        },
      ],
    }).compile();

    controller = moduleRef.get(CommentController);
  });

  it('maps query and detail responses', async () => {
    await expect(controller.getByArticle({ articleId: 'article-id' })).resolves.toEqual([commentFixture()]);
    await expect(controller.getById('comment-id')).resolves.toEqual(commentFixture());
  });

  it('enforces create RBAC and assigns editor authorship', async () => {
    process.env.TEST_MODE = 'auth';

    await expect(controller.create({ content: 'Text', articleId: 'article-id' }, viewerUser)).rejects.toThrow(
      ForbiddenError,
    );
    await controller.create({ content: 'Text', articleId: 'article-id' }, editorUser);
    await expect(
      controller.create({ content: 'Text', articleId: 'article-id', authorId: 'other-user' }, editorUser),
    ).rejects.toThrow(ForbiddenError);

    expect(commentService.create).toHaveBeenCalledWith({
      content: 'Text',
      articleId: 'article-id',
      authorId: editorUser.userId,
    });
  });

  it('enforces delete RBAC and editor ownership', async () => {
    process.env.TEST_MODE = 'auth';

    await expect(controller.delete('comment-id', viewerUser)).rejects.toThrow(ForbiddenError);

    commentService.getByIdOrThrow.mockResolvedValue(commentFixture({ authorId: 'other-user' }));
    await expect(controller.delete('comment-id', editorUser)).rejects.toThrow(ForbiddenError);

    commentService.getByIdOrThrow.mockResolvedValue(commentFixture({ authorId: editorUser.userId }));
    await controller.delete('comment-id', editorUser);

    expect(commentService.delete).toHaveBeenCalledWith('comment-id');
  });
});
