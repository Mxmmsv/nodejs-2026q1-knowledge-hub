import { ArticleStatus, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const seedPassword = 'SeedPass123!';

const seedIds = {
  users: {
    admin: '11111111-1111-4111-8111-111111111111',
    editor: '22222222-2222-4222-8222-222222222222',
    viewer: '33333333-3333-4333-8333-333333333333',
  },
  categories: {
    backend: '44444444-4444-4444-8444-444444444444',
    devops: '55555555-5555-4555-8555-555555555555',
    architecture: '66666666-6666-4666-8666-666666666666',
  },
  articles: {
    stableApi: '77777777-7777-4777-8777-777777777777',
    dockerCompose: '88888888-8888-4888-8888-888888888888',
    legacyEndpoints: '99999999-9999-4999-8999-999999999999',
    prismaCrud: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    reviewFlows: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  },
  comments: {
    dtoValidation: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    dockerChecklist: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    queryOptimization: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  },
};

interface SeedDatabaseOptions {
  reset?: boolean;
}

export async function seedDatabase(options: SeedDatabaseOptions = {}): Promise<void> {
  const prisma = new PrismaClient();
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  try {
    if (options.reset) {
      await resetDatabase(prisma);
    }

    const [adminUser, editorUser, viewerUser] = await Promise.all([
      upsertSeedUser(prisma, seedIds.users.admin, 'seed_admin', hashedPassword, UserRole.ADMIN),
      upsertSeedUser(prisma, seedIds.users.editor, 'seed_editor', hashedPassword, UserRole.EDITOR),
      upsertSeedUser(prisma, seedIds.users.viewer, 'seed_viewer', hashedPassword, UserRole.VIEWER),
    ]);

    const [backendCategory, devopsCategory, architectureCategory] = await Promise.all([
      prisma.category.upsert({
        where: { id: seedIds.categories.backend },
        update: {
          description: 'Articles about server-side development and API design.',
          name: 'Backend',
        },
        create: {
          id: seedIds.categories.backend,
          name: 'Backend',
          description: 'Articles about server-side development and API design.',
        },
      }),
      prisma.category.upsert({
        where: { id: seedIds.categories.devops },
        update: {
          description: 'Articles about delivery pipelines, containers, and operations.',
          name: 'DevOps',
        },
        create: {
          id: seedIds.categories.devops,
          name: 'DevOps',
          description: 'Articles about delivery pipelines, containers, and operations.',
        },
      }),
      prisma.category.upsert({
        where: { id: seedIds.categories.architecture },
        update: {
          description: 'Articles about system design, patterns, and maintainability.',
          name: 'Architecture',
        },
        create: {
          id: seedIds.categories.architecture,
          name: 'Architecture',
          description: 'Articles about system design, patterns, and maintainability.',
        },
      }),
    ]);

    const [nestjsTag, prismaTag, dockerTag, postgresTag, testingTag] = await Promise.all(
      ['nestjs', 'prisma', 'docker', 'postgres', 'testing'].map((name) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );

    const [articleOne, articleTwo, articleThree, articleFour, articleFive] = await Promise.all([
      prisma.article.upsert({
        where: { id: seedIds.articles.stableApi },
        update: {
          authorId: adminUser.id,
          categoryId: backendCategory.id,
          content: 'A practical guide to controllers, DTOs, validation pipes, and service boundaries in a NestJS API.',
          status: ArticleStatus.DRAFT,
          tags: {
            set: [{ id: nestjsTag.id }, { id: prismaTag.id }],
          },
          title: 'Designing a Stable NestJS API',
        },
        create: {
          id: seedIds.articles.stableApi,
          title: 'Designing a Stable NestJS API',
          content: 'A practical guide to controllers, DTOs, validation pipes, and service boundaries in a NestJS API.',
          status: ArticleStatus.DRAFT,
          authorId: adminUser.id,
          categoryId: backendCategory.id,
          tags: {
            connect: [{ id: nestjsTag.id }, { id: prismaTag.id }],
          },
        },
      }),
      prisma.article.upsert({
        where: { id: seedIds.articles.dockerCompose },
        update: {
          authorId: editorUser.id,
          categoryId: devopsCategory.id,
          content: 'Using containers for local parity, health checks, migrations, and repeatable startup flows.',
          status: ArticleStatus.PUBLISHED,
          tags: {
            set: [{ id: dockerTag.id }, { id: postgresTag.id }],
          },
          title: 'Shipping Services with Docker Compose',
        },
        create: {
          id: seedIds.articles.dockerCompose,
          title: 'Shipping Services with Docker Compose',
          content: 'Using containers for local parity, health checks, migrations, and repeatable startup flows.',
          status: ArticleStatus.PUBLISHED,
          authorId: editorUser.id,
          categoryId: devopsCategory.id,
          tags: {
            connect: [{ id: dockerTag.id }, { id: postgresTag.id }],
          },
        },
      }),
      prisma.article.upsert({
        where: { id: seedIds.articles.legacyEndpoints },
        update: {
          authorId: adminUser.id,
          categoryId: architectureCategory.id,
          content: 'How to retire APIs without breaking existing consumers, clients, and documentation workflows.',
          status: ArticleStatus.ARCHIVED,
          tags: {
            set: [{ id: testingTag.id }, { id: nestjsTag.id }],
          },
          title: 'When to Archive Legacy Endpoints',
        },
        create: {
          id: seedIds.articles.legacyEndpoints,
          title: 'When to Archive Legacy Endpoints',
          content: 'How to retire APIs without breaking existing consumers, clients, and documentation workflows.',
          status: ArticleStatus.ARCHIVED,
          authorId: adminUser.id,
          categoryId: architectureCategory.id,
          tags: {
            connect: [{ id: testingTag.id }, { id: nestjsTag.id }],
          },
        },
      }),
      prisma.article.upsert({
        where: { id: seedIds.articles.prismaCrud },
        update: {
          authorId: editorUser.id,
          categoryId: backendCategory.id,
          content: 'Building data access with predictable reads, writes, relation handling, and query boundaries.',
          status: ArticleStatus.PUBLISHED,
          tags: {
            set: [{ id: prismaTag.id }, { id: postgresTag.id }],
          },
          title: 'Prisma Query Patterns for CRUD Services',
        },
        create: {
          id: seedIds.articles.prismaCrud,
          title: 'Prisma Query Patterns for CRUD Services',
          content: 'Building data access with predictable reads, writes, relation handling, and query boundaries.',
          status: ArticleStatus.PUBLISHED,
          authorId: editorUser.id,
          categoryId: backendCategory.id,
          tags: {
            connect: [{ id: prismaTag.id }, { id: postgresTag.id }],
          },
        },
      }),
      prisma.article.upsert({
        where: { id: seedIds.articles.reviewFlows },
        update: {
          authorId: viewerUser.id,
          categoryId: architectureCategory.id,
          content:
            'A checklist for validating role-sensitive behavior, refresh flows, and shared test data before release.',
          status: ArticleStatus.DRAFT,
          tags: {
            set: [{ id: testingTag.id }, { id: dockerTag.id }],
          },
          title: 'Testing Review Flows Before Release',
        },
        create: {
          id: seedIds.articles.reviewFlows,
          title: 'Testing Review Flows Before Release',
          content:
            'A checklist for validating role-sensitive behavior, refresh flows, and shared test data before release.',
          status: ArticleStatus.DRAFT,
          authorId: viewerUser.id,
          categoryId: architectureCategory.id,
          tags: {
            connect: [{ id: testingTag.id }, { id: dockerTag.id }],
          },
        },
      }),
    ]);

    await Promise.all([
      upsertSeedComment(
        prisma,
        seedIds.comments.dtoValidation,
        'This draft needs one more example around DTO validation.',
        articleOne.id,
        editorUser.id,
      ),
      upsertSeedComment(
        prisma,
        seedIds.comments.dockerChecklist,
        'The container checklist is concise and production-friendly.',
        articleTwo.id,
        adminUser.id,
      ),
      upsertSeedComment(
        prisma,
        seedIds.comments.queryOptimization,
        'Add a note about query optimization before publishing this one.',
        articleFour.id,
        viewerUser.id,
      ),
    ]);

    console.log(
      [
        'Database seeded successfully.',
        `Users: 3 (${adminUser.login}, ${editorUser.login}, ${viewerUser.login})`,
        `Categories: 3 (${backendCategory.name}, ${devopsCategory.name}, ${architectureCategory.name})`,
        'Tags: 5 (nestjs, prisma, docker, postgres, testing)',
        `Articles: 5 (${articleOne.title}, ${articleTwo.title}, ${articleThree.title}, ${articleFour.title}, ${articleFive.title})`,
        'Comments: 3',
        `Sample article id for AI testing: ${articleTwo.id}`,
      ].join('\n'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.comment.deleteMany();
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.user.deleteMany();
}

function upsertSeedUser(prisma: PrismaClient, id: string, login: string, password: string, role: UserRole) {
  return prisma.user.upsert({
    where: { login },
    update: {
      password,
      role,
    },
    create: {
      id,
      login,
      password,
      role,
    },
  });
}

function upsertSeedComment(prisma: PrismaClient, id: string, content: string, articleId: string, authorId: string) {
  return prisma.comment.upsert({
    where: { id },
    update: {
      articleId,
      authorId,
      content,
    },
    create: {
      id,
      content,
      articleId,
      authorId,
    },
  });
}
