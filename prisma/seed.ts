import { seedDatabase } from '../src/prisma/seed-database';

void seedDatabase({ reset: true }).catch((error: unknown) => {
  console.error('Failed to seed database.', error);
  process.exitCode = 1;
});
