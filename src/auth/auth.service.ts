import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto } from '../user/dto';
import { User } from '../user/models/user.model';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { toDomainUserRole } from '../prisma/mappers/prisma-enum.mappers';
import { AuthUser } from './auth.types';
import { isAuthMode, isPasswordMatch, isTestLogin } from './auth.utils';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async signup(createUserDto: CreateUserDto): Promise<User> {
    if (isAuthMode() && isTestLogin(createUserDto.login)) {
      await this.prisma.user.deleteMany({
        where: { login: createUserDto.login },
      });
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { login: createUserDto.login },
      orderBy: { createdAt: 'desc' },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const shouldCreateTestAdmin =
      isAuthMode() &&
      isTestLogin(createUserDto.login) &&
      !(await this.prisma.user.findFirst({
        where: {
          login: { startsWith: 'TEST_' },
          role: PrismaUserRole.ADMIN,
        },
      }));

    return this.userService.create({
      ...createUserDto,
      role: shouldCreateTestAdmin ? (createUserDto.role ?? UserRole.ADMIN) : createUserDto.role,
    });
  }

  async login(login: string | undefined, password: string | undefined): Promise<TokenPair> {
    if (!login || !password) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findFirst({
      where: { login },
      orderBy: { createdAt: 'desc' },
    });

    if (!user || !(await isPasswordMatch(password, user.password))) {
      throw new UnauthorizedException();
    }

    return this.createTokenPair({
      userId: user.id,
      login: user.login,
      role: toDomainUserRole(user.role),
    });
  }

  async refresh(refreshToken: string | undefined): Promise<TokenPair> {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    let payload: AuthUser;

    try {
      payload = await this.jwtService.verifyAsync<AuthUser>(refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
      });
    } catch {
      throw new ForbiddenException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new ForbiddenException();
    }

    return this.createTokenPair({
      userId: user.id,
      login: user.login,
      role: toDomainUserRole(user.role),
    });
  }

  private createTokenPair(payload: AuthUser): TokenPair {
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_KEY,
      expiresIn: (process.env.TOKEN_EXPIRE_TIME ?? '1h') as never,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_REFRESH_KEY,
      expiresIn: (process.env.TOKEN_REFRESH_EXPIRE_TIME ?? '24h') as never,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
