import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.unit.spec.ts'],
    setupFiles: ['test/unit/setup-unit.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.model.ts',
        'src/**/*.dto.ts',
        'src/**/*.decorator.ts',
        'src/**/*.unit.spec.ts',
        'src/**/repositories/**',
        'src/common/middleware/**',
        'src/prisma/prisma.service.ts',
        'src/prisma/run-seed.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});
