import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { createAuditTimestamps } from '../common/utils/create-audit-timestamps';
import { createEntityId } from '../common/utils/create-entity-id';
import { getCurrentTimestamp } from '../common/utils/get-current-timestamp';
import { ArticleService } from '../article/article.service';
import { CommentService } from '../comment/comment.service';
import { CreateUserDto, UpdatePasswordDto } from './dto';
import { User } from './models/user.model';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly articleService: ArticleService,
    private readonly commentService: CommentService,
    @Inject(UserRepository)
    private readonly userRepository: UserRepository,
  ) {}

  findAll(): User[] {
    return this.userRepository.findAll();
  }

  findById(id: string): User | undefined {
    return this.userRepository.findById(id);
  }

  getByIdOrThrow(id: string): User {
    const user = this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(AppErrorMessages.USER_NOT_FOUND);
    }

    return user;
  }

  create(createUserDto: CreateUserDto): User {
    const user: User = {
      id: createEntityId(),
      login: createUserDto.login,
      password: createUserDto.password,
      role: createUserDto.role ?? UserRole.VIEWER,
      ...createAuditTimestamps(),
    };

    return this.userRepository.save(user);
  }

  updatePassword(id: string, updatePasswordDto: UpdatePasswordDto): User {
    const user = this.getByIdOrThrow(id);

    if (user.password !== updatePasswordDto.oldPassword) {
      throw new ForbiddenException(AppErrorMessages.USER_OLD_PASSWORD_MISMATCH);
    }

    return this.userRepository.save({
      ...user,
      password: updatePasswordDto.newPassword,
      updatedAt: getCurrentTimestamp(),
    });
  }

  delete(id: string): void {
    this.getByIdOrThrow(id);

    this.articleService.clearAuthorIdByUserId(id);
    this.commentService.removeByAuthorId(id);
    this.userRepository.remove(id);
  }
}
