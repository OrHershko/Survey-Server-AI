const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file first
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Also try loading .env.test if it exists (for test-specific overrides)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Set default test environment variables (force test environment)
process.env.NODE_ENV = 'test';

if (!process.env.USE_MOCK_LLM) {
  process.env.USE_MOCK_LLM = 'true';
}

if (!process.env.REGISTRATION_SECRET) {
  process.env.REGISTRATION_SECRET = 'test-registration-secret';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret';
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
} 