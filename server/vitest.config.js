import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-key-at-least-16-chars',
      MONGO_URI: 'mongodb://unused-in-tests',
      CLIENT_URL: 'http://localhost:5173',
    },
    // Birinchi ishga tushirishda mongodb-memory-server MongoDB binarini yuklab oladi.
    hookTimeout: 120_000,
    testTimeout: 20_000,
  },
});
