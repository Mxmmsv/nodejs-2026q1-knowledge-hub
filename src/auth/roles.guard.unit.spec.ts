import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../common/enums/user-role.enum';
import { ForbiddenError } from '../common/errors';
import { createHttpExecutionContext } from '../../test/unit/mock-execution-context';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: {
    getAllAndOverride: ReturnType<typeof vi.fn>;
  };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows requests when no role metadata is present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createHttpExecutionContext({}))).toBe(true);
  });

  it('allows users with a matching role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(
        createHttpExecutionContext({
          user: {
            userId: 'user-id',
            login: 'admin',
            role: UserRole.ADMIN,
          },
        }),
      ),
    ).toBe(true);
  });

  it('rejects missing users and insufficient roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(createHttpExecutionContext({}))).toThrow(ForbiddenError);
    expect(() =>
      guard.canActivate(
        createHttpExecutionContext({
          user: {
            userId: 'user-id',
            login: 'viewer',
            role: UserRole.VIEWER,
          },
        }),
      ),
    ).toThrow(ForbiddenError);
  });
});
