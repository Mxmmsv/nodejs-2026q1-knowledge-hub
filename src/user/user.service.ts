import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { createAuditTimestamps } from '../common/utils/create-audit-timestamps';
import { createEntityId } from '../common/utils/create-entity-id';
import { getCurrentTimestamp } from '../common/utils/get-current-timestamp';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdatePasswordDto } from './dto';
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
      throw new NotFoundException(AppErrorMessages.USER_NOT_FOUND);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user: User = {
      id: createEntityId(),
      login: createUserDto.login,
      password: createUserDto.password,
      role: createUserDto.role ?? UserRole.VIEWER,
      ...createAuditTimestamps(),
    };

    return this.userRepository.save(user);
  }

  async updatePassword(id: string, updatePasswordDto: UpdatePasswordDto): Promise<User> {
    const user = await this.getByIdOrThrow(id);

    if (user.password !== updatePasswordDto.oldPassword) {
      throw new ForbiddenException(AppErrorMessages.USER_OLD_PASSWORD_MISMATCH);
    }

    return this.userRepository.save({
      ...user,
      password: updatePasswordDto.newPassword,
      updatedAt: getCurrentTimestamp(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.getByIdOrThrow(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.article.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      });

      await tx.comment.deleteMany({
        where: { authorId: id },
      });

      await tx.user.delete({
        where: { id },
      });
    });
  }
}
