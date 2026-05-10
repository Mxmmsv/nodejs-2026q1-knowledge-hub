import { seedDatabase } from './seed-database';

void seedDatabase({
  reset: process.env.SEED_RESET === 'true',
}).catch((error: unknown) => {
  console.error('Failed to seed database.', error);
  process.exitCode = 1;
});
