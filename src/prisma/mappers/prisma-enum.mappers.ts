import { ArticleStatus as PrismaArticleStatus, UserRole as PrismaUserRole } from '@prisma/client';
import { ArticleStatus } from '../../common/enums/article-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';

const prismaToDomainUserRole: Record<PrismaUserRole, UserRole> = {
  [PrismaUserRole.ADMIN]: UserRole.ADMIN,
  [PrismaUserRole.EDITOR]: UserRole.EDITOR,
  [PrismaUserRole.VIEWER]: UserRole.VIEWER,
};

const domainToPrismaUserRole: Record<UserRole, PrismaUserRole> = {
  [UserRole.ADMIN]: PrismaUserRole.ADMIN,
  [UserRole.EDITOR]: PrismaUserRole.EDITOR,
  [UserRole.VIEWER]: PrismaUserRole.VIEWER,
};

const prismaToDomainArticleStatus: Record<PrismaArticleStatus, ArticleStatus> = {
  [PrismaArticleStatus.DRAFT]: ArticleStatus.DRAFT,
  [PrismaArticleStatus.PUBLISHED]: ArticleStatus.PUBLISHED,
  [PrismaArticleStatus.ARCHIVED]: ArticleStatus.ARCHIVED,
};

const domainToPrismaArticleStatus: Record<ArticleStatus, PrismaArticleStatus> = {
  [ArticleStatus.DRAFT]: PrismaArticleStatus.DRAFT,
  [ArticleStatus.PUBLISHED]: PrismaArticleStatus.PUBLISHED,
  [ArticleStatus.ARCHIVED]: PrismaArticleStatus.ARCHIVED,
};

export const toDomainUserRole = (role: PrismaUserRole): UserRole => prismaToDomainUserRole[role];

export const toPrismaUserRole = (role: UserRole): PrismaUserRole => domainToPrismaUserRole[role];

export const toDomainArticleStatus = (status: PrismaArticleStatus): ArticleStatus =>
  prismaToDomainArticleStatus[status];

export const toPrismaArticleStatus = (status: ArticleStatus): PrismaArticleStatus =>
  domainToPrismaArticleStatus[status];
