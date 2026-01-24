/**
 * Jest Configuration
 * Configures test environment, coverage thresholds, reporters
 */

export default {
  displayName: 'aqherbal-backend-tests',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Entry point
    '!src/**/*.model.js', // Models are mostly Mongoose boilerplate
    '!src/config/**', // Config files
    '!src/utils/logger.js', // Logging utilities
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    './src/middlewares/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/modules/': {
      branches: 85,
      functions: 85,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  transform: {},
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  verbose: true,
  bail: false,
  maxWorkers: 4,
  forceExit: true,
  detectOpenHandles: true,
  logHeapUsage: true,
};
