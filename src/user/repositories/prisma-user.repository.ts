import { Injectable } from '@nestjs/common';
import { User } from '../models/user.model';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserModel } from '../../prisma/mappers/prisma-record.mappers';
import { toPrismaUserRole } from '../../prisma/mappers/prisma-enum.mappers';
import { UserRepository } from './user.repository';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return users.map(toUserModel);
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? toUserModel(user) : undefined;
  }

  async save(user: User): Promise<User> {
    const savedUser = await this.prisma.user.upsert({
      where: { id: user.id },
      update: {
        login: user.login,
        password: user.password,
        role: toPrismaUserRole(user.role),
        updatedAt: new Date(user.updatedAt),
      },
      create: {
        id: user.id,
        login: user.login,
        password: user.password,
        role: toPrismaUserRole(user.role),
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
    });

    return toUserModel(savedUser);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.prisma.user.deleteMany({
      where: { id },
    });

    return result.count > 0;
  }
}
