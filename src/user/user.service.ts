import { Inject, Injectable } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { ForbiddenError, NotFoundError, ValidationError } from '../common/errors';
import { createAuditTimestamps } from '../common/utils/create-audit-timestamps';
import { createEntityId } from '../common/utils/create-entity-id';
import { getCurrentTimestamp } from '../common/utils/get-current-timestamp';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, isPasswordMatch } from '../auth/auth.utils';
import { toUserModel } from '../prisma/mappers/prisma-record.mappers';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from './models/user.model';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(UserRepository)
    private readonly userRepository: UserRepository,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findById(id: string): Promise<User | undefined> {
    return this.userRepository.findById(id);
  }

  async getByIdOrThrow(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError(AppErrorMessages.USER_NOT_FOUND);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { login: createUserDto.login },
    });

    if (existingUser) {
      throw new ValidationError(AppErrorMessages.USER_ALREADY_EXISTS);
    }

    const user: User = {
      id: createEntityId(),
      login: createUserDto.login,
      password: await hashPassword(createUserDto.password),
      role: UserRole.VIEWER,
      ...createAuditTimestamps(),
    };

    return this.userRepository.save(user);
  }

  async removeByLoginIfExists(login: string): Promise<void> {
    await this.prisma.user.deleteMany({
      where: { login },
    });
  }

  async updatePassword(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundError(AppErrorMessages.USER_NOT_FOUND);
      }

      if (!(await isPasswordMatch(updateUserDto.oldPassword ?? '', user.password))) {
        throw new ForbiddenError(AppErrorMessages.USER_OLD_PASSWORD_MISMATCH);
      }

      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          password: await hashPassword(updateUserDto.newPassword ?? ''),
          updatedAt: new Date(getCurrentTimestamp()),
        },
      });

      return toUserModel(updatedUser);
    });
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.getByIdOrThrow(id);

    return this.userRepository.save({
      ...user,
      role,
      updatedAt: getCurrentTimestamp(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.getByIdOrThrow(id);
    await this.userRepository.remove(id);
  }
}
