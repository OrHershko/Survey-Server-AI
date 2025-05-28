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
  ],
  preset: '@shelf/jest-mongodb',
  watchPathIgnorePatterns: ['globalConfig'] // Required for mongodb-memory-server
}; 