import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User as PrismaUser } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import { User } from '../user/models/user.model';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { toDomainUserRole } from '../prisma/mappers/prisma-enum.mappers';
import { SignupDto } from './dto';
import { AuthUser, RefreshTokenPayload } from './auth.types';
import {
  getAccessTokenSecret,
  getAccessTokenTtl,
  getRefreshTokenSecret,
  getRefreshTokenTtl,
  hashToken,
  isAuthMode,
  isPasswordMatch,
  isRefreshTokenPayload,
  isTestLogin,
} from './auth.utils';

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

  async signup(signupDto: SignupDto): Promise<User> {
    if (isAuthMode() && isTestLogin(signupDto.login)) {
      await this.prisma.user.deleteMany({
        where: { login: signupDto.login },
      });
    }

    return this.userService.create(signupDto);
  }

  async login(login: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { login },
    });

    if (!user || !(await isPasswordMatch(password, user.password))) {
      throw new ForbiddenError(AppErrorMessages.AUTH_INVALID_CREDENTIALS);
    }

    return this.issueTokenPair(user);
  }

  async refresh(refreshTokenInput: unknown): Promise<TokenPair> {
    const refreshToken = this.extractRefreshTokenOrThrow(refreshTokenInput);
    const payload = await this.verifyRefreshTokenOrThrow(refreshToken);

    const refreshSession = await this.prisma.refreshSession.findUnique({
      where: { id: payload.jti },
    });

    if (
      !refreshSession ||
      refreshSession.userId !== payload.userId ||
      refreshSession.revokedAt !== null ||
      refreshSession.expiresAt.getTime() <= Date.now() ||
      refreshSession.tokenHash !== hashToken(refreshToken)
    ) {
      throw new ForbiddenError(AppErrorMessages.AUTH_REFRESH_TOKEN_INVALID);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new ForbiddenError(AppErrorMessages.AUTH_REFRESH_TOKEN_INVALID);
    }

    return this.prisma.$transaction(async (transactionClient) => {
      await this.revokeRefreshSession(payload.jti, transactionClient);
      return this.issueTokenPair(user, transactionClient);
    });
  }

  async logout(refreshTokenInput: unknown): Promise<void> {
    const refreshToken = this.extractRefreshTokenOrThrow(refreshTokenInput);
    const payload = await this.verifyRefreshTokenOrThrow(refreshToken);
    const refreshSession = await this.prisma.refreshSession.findUnique({
      where: { id: payload.jti },
    });

    if (
      !refreshSession ||
      refreshSession.userId !== payload.userId ||
      refreshSession.revokedAt !== null ||
      refreshSession.expiresAt.getTime() <= Date.now() ||
      refreshSession.tokenHash !== hashToken(refreshToken)
    ) {
      throw new ForbiddenError(AppErrorMessages.AUTH_REFRESH_TOKEN_INVALID);
    }

    await this.revokeRefreshSession(payload.jti, this.prisma);
  }

  private async issueTokenPair(
    user: PrismaUser,
    transactionClient: Prisma.TransactionClient = this.prisma,
  ): Promise<TokenPair> {
    const authUser = this.toAuthUser(user);
    const accessToken = await this.jwtService.signAsync(authUser, {
      secret: getAccessTokenSecret(),
      expiresIn: getAccessTokenTtl() as never,
    });
    const refreshTokenPayload: RefreshTokenPayload = {
      ...authUser,
      jti: randomUUID(),
    };
    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: getRefreshTokenSecret(),
      expiresIn: getRefreshTokenTtl() as never,
    });
    const refreshTokenExpiresAt = this.extractTokenExpirationDate(refreshToken);

    await transactionClient.refreshSession.create({
      data: {
        id: refreshTokenPayload.jti,
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async verifyRefreshTokenOrThrow(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: getRefreshTokenSecret(),
      });

      if (!isRefreshTokenPayload(payload)) {
        throw new Error('Invalid refresh token payload');
      }

      return payload;
    } catch {
      throw new ForbiddenError(AppErrorMessages.AUTH_REFRESH_TOKEN_INVALID);
    }
  }

  private extractRefreshTokenOrThrow(refreshToken: unknown): string {
    if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
      throw new UnauthorizedError(AppErrorMessages.AUTH_REFRESH_TOKEN_REQUIRED);
    }

    return refreshToken;
  }

  private extractTokenExpirationDate(token: string): Date {
    const decodedToken = this.jwtService.decode(token);

    if (!decodedToken || typeof decodedToken === 'string' || typeof decodedToken.exp !== 'number') {
      throw new ForbiddenError(AppErrorMessages.AUTH_REFRESH_TOKEN_INVALID);
    }

    return new Date(decodedToken.exp * 1000);
  }

  private async revokeRefreshSession(
    refreshSessionId: string,
    transactionClient: Prisma.TransactionClient | PrismaService,
  ): Promise<void> {
    await transactionClient.refreshSession.update({
      where: { id: refreshSessionId },
      data: { revokedAt: new Date() },
    });
  }

  private toAuthUser(user: PrismaUser): AuthUser {
    return {
      userId: user.id,
      login: user.login,
      role: toDomainUserRole(user.role),
    };
  }
}
