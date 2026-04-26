import { Test } from '@nestjs/testing';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, isPasswordMatch } from '../auth/auth.utils';
import { UserRole } from '../common/enums/user-role.enum';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { ForbiddenError, NotFoundError, ValidationError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { User } from './models/user.model';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './user.service';

const userFixture = (overrides: Partial<User> = {}): User => ({
  id: '11111111-1111-4111-8111-111111111111',
  login: 'user',
  password: 'hashed',
  role: UserRole.VIEWER,
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

const prismaUserFixture = (overrides: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  login: 'user',
  password: 'hashed',
  role: PrismaUserRole.VIEWER,
  createdAt: new Date(1000),
  updatedAt: new Date(1000),
  ...overrides,
});

describe('UserService', () => {
  let service: UserService;
  let userRepository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    userRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(async (user: User) => user),
      remove: vi.fn(async () => true),
    };
    prisma = {
      user: {
        findUnique: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: UserRepository,
          useValue: userRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(UserService);
  });

  it('creates users with hashed password and viewer role', async () => {
    prisma.user.findUnique.mockResolvedValue(undefined);

    const user = await service.create({ login: 'new-user', password: 'secret' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { login: 'new-user' } });
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        login: 'new-user',
        role: UserRole.VIEWER,
      }),
    );
    expect(user.password).not.toBe('secret');
    await expect(isPasswordMatch('secret', user.password)).resolves.toBe(true);
  });

  it('rejects duplicate login on create', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUserFixture());

    await expect(service.create({ login: 'user', password: 'secret' })).rejects.toThrow(
      new ValidationError(AppErrorMessages.USER_ALREADY_EXISTS),
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('throws when user is not found by id', async () => {
    userRepository.findById.mockResolvedValue(undefined);

    await expect(service.getByIdOrThrow('missing')).rejects.toThrow(new NotFoundError(AppErrorMessages.USER_NOT_FOUND));
  });

  it('updates a user role after loading the user', async () => {
    const existing = userFixture();
    userRepository.findById.mockResolvedValue(existing);

    await service.updateRole(existing.id, UserRole.ADMIN);

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existing.id,
        role: UserRole.ADMIN,
        updatedAt: expect.any(Number),
      }),
    );
  });

  it('updates password inside a transaction when old password matches', async () => {
    const oldPasswordHash = await hashPassword('old-secret');
    const updatedPrismaUser = prismaUserFixture({ password: await hashPassword('new-secret') });
    const tx = {
      user: {
        findUnique: vi.fn(async () => prismaUserFixture({ password: oldPasswordHash })),
        update: vi.fn(async () => updatedPrismaUser),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<User>) => callback(tx));

    const user = await service.updatePassword('user-id', {
      oldPassword: 'old-secret',
      newPassword: 'new-secret',
    });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: {
        password: expect.any(String),
        updatedAt: expect.any(Date),
      },
    });
    await expect(isPasswordMatch('new-secret', user.password)).resolves.toBe(true);
  });

  it('rejects password update when user is missing', async () => {
    const tx = {
      user: {
        findUnique: vi.fn(async () => undefined),
        update: vi.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<User>) => callback(tx));

    await expect(
      service.updatePassword('missing', {
        oldPassword: 'old-secret',
        newPassword: 'new-secret',
      }),
    ).rejects.toThrow(new NotFoundError(AppErrorMessages.USER_NOT_FOUND));
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects password update when old password does not match', async () => {
    const tx = {
      user: {
        findUnique: vi.fn(async () => prismaUserFixture({ password: await hashPassword('actual-secret') })),
        update: vi.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<User>) => callback(tx));

    await expect(
      service.updatePassword('user-id', {
        oldPassword: 'wrong-secret',
        newPassword: 'new-secret',
      }),
    ).rejects.toThrow(new ForbiddenError(AppErrorMessages.USER_OLD_PASSWORD_MISMATCH));
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('checks existence before delete', async () => {
    const existing = userFixture();
    userRepository.findById.mockResolvedValue(existing);

    await service.delete(existing.id);

    expect(userRepository.remove).toHaveBeenCalledWith(existing.id);
  });
});
