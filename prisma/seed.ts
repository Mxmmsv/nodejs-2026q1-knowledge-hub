import { ArticleStatus, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const hashedPassword = await bcrypt.hash('SeedPass123!', 10);

  await prisma.comment.deleteMany();
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.user.deleteMany();

  const [adminUser, editorUser, viewerUser] = await Promise.all([
    prisma.user.create({
      data: {
        login: 'seed_admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        login: 'seed_editor',
        password: hashedPassword,
        role: UserRole.EDITOR,
      },
    }),
    prisma.user.create({
      data: {
        login: 'seed_viewer',
        password: hashedPassword,
        role: UserRole.VIEWER,
      },
    }),
  ]);

  const [backendCategory, devopsCategory, architectureCategory] = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Backend',
        description: 'Articles about server-side development and API design.',
      },
    }),
    prisma.category.create({
      data: {
        name: 'DevOps',
        description: 'Articles about delivery pipelines, containers, and operations.',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Architecture',
        description: 'Articles about system design, patterns, and maintainability.',
      },
    }),
  ]);

  const [nestjsTag, prismaTag, dockerTag, postgresTag, testingTag] = await Promise.all([
    prisma.tag.create({ data: { name: 'nestjs' } }),
    prisma.tag.create({ data: { name: 'prisma' } }),
    prisma.tag.create({ data: { name: 'docker' } }),
    prisma.tag.create({ data: { name: 'postgres' } }),
    prisma.tag.create({ data: { name: 'testing' } }),
  ]);

  const [articleOne, articleTwo, articleThree, articleFour, articleFive] = await Promise.all([
    prisma.article.create({
      data: {
        title: 'Designing a Stable NestJS API',
        content: 'A practical guide to controllers, DTOs, and service boundaries.',
        status: ArticleStatus.DRAFT,
        authorId: adminUser.id,
        categoryId: backendCategory.id,
        tags: {
          connect: [{ id: nestjsTag.id }, { id: prismaTag.id }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Shipping Services with Docker Compose',
        content: 'Using containers for local parity, health checks, and fast startup.',
        status: ArticleStatus.PUBLISHED,
        authorId: editorUser.id,
        categoryId: devopsCategory.id,
        tags: {
          connect: [{ id: dockerTag.id }, { id: postgresTag.id }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'When to Archive Legacy Endpoints',
        content: 'How to retire APIs without breaking existing consumers.',
        status: ArticleStatus.ARCHIVED,
        authorId: adminUser.id,
        categoryId: architectureCategory.id,
        tags: {
          connect: [{ id: testingTag.id }, { id: nestjsTag.id }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Prisma Query Patterns for CRUD Services',
        content: 'Building data access with predictable reads, writes, and relations.',
        status: ArticleStatus.PUBLISHED,
        authorId: editorUser.id,
        categoryId: backendCategory.id,
        tags: {
          connect: [{ id: prismaTag.id }, { id: postgresTag.id }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Testing Review Flows Before Release',
        content: 'A checklist for validating role-sensitive behavior in shared systems.',
        status: ArticleStatus.DRAFT,
        authorId: viewerUser.id,
        categoryId: architectureCategory.id,
        tags: {
          connect: [{ id: testingTag.id }, { id: dockerTag.id }],
        },
      },
    }),
  ]);

  await prisma.comment.createMany({
    data: [
      {
        content: 'This draft needs one more example around DTO validation.',
        articleId: articleOne.id,
        authorId: editorUser.id,
      },
      {
        content: 'The container checklist is concise and production-friendly.',
        articleId: articleTwo.id,
        authorId: adminUser.id,
      },
      {
        content: 'Add a note about query optimization before publishing this one.',
        articleId: articleFour.id,
        authorId: viewerUser.id,
      },
    ],
  });

  console.log(
    [
      'Database seeded successfully.',
      `Users: 3 (${adminUser.login}, ${editorUser.login}, ${viewerUser.login})`,
      `Categories: 3 (${backendCategory.name}, ${devopsCategory.name}, ${architectureCategory.name})`,
      'Tags: 5 (nestjs, prisma, docker, postgres, testing)',
      `Articles: 5 (${articleOne.title}, ${articleTwo.title}, ${articleThree.title}, ${articleFour.title}, ${articleFive.title})`,
      'Comments: 3',
    ].join('\n'),
  );
}

main()
  .catch(async (error: unknown) => {
    console.error('Failed to seed database.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
