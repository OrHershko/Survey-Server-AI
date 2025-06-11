module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.git/'],
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!server.js', // Typically, server startup logic is harder to unit test directly
    '!**/config/**', // Configuration files usually don't have logic to test
    '!**/tests/**', // Test files themselves
    '!**/prompts/**', // Prompt files
    '!**/logs/**',
    '!**/.husky/**'
  ],
  preset: '@shelf/jest-mongodb',
  watchPathIgnorePatterns: ['globalConfig'], // Required for mongodb-memory-server
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000, // 30 seconds for tests
  setupFiles: ['<rootDir>/tests/env.setup.js']
}; 