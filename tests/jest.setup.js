/**
 * Jest Setup File
 * Global setup and teardown for all tests
 */

// Suppress console logs during tests (optional)
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress logs unless test is failing
  global.testMode = true;
});

afterAll(() => {
  global.testMode = false;
});

// Mock environment variables if not set
if (!process.env.MONGODB_TEST_URI) {
  process.env.MONGODB_TEST_URI = 'mongodb://localhost:27017/aqherbal-test';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production';
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-do-not-use-in-production';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

export {};
