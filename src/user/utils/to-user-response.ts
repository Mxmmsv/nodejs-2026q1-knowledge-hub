import { User } from '../models/user.model';
import { UserResponseDto } from '../dto';

export const toUserResponse = (user: User): UserResponseDto => ({
  id: user.id,
  login: user.login,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
