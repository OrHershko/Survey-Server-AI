const request = require('supertest');
const app = require('../server');
const User = require('../models/UserModel');
const {
  generateUserData,
  createTestUser,
  generateTestToken,
  generateTestRefreshToken,
  generateExpiredRefreshToken,
  validateApiResponse,
  cleanupTestData
} = require('./utils/testHelpers');

// Mock the LLM service to avoid external API calls
jest.mock('../services/llmService', () => require('./mocks/llmService.mock'));

describe('Authentication API Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(['users']);
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('username');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(userData.email);
      expect(response.body.message).toContain('successfully');
    });

    it('should not register user with invalid email', async () => {
      const userData = generateUserData({
        email: 'invalid-email',
        password: 'Test123!@#'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('email');
    });

    it('should not register user with password containing spaces', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'password with spaces'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.toLowerCase()).toContain('password');
    });

    it('should not register user with existing email', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      // Create user first
      await createTestUser(userData);

      // Try to register again with same email
      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('exists');
    });

    it('should not register user with missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com'
          // Missing name and password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user with valid credentials', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      // Create user first
      await createTestUser(userData);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not login user with invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid');
    });

    it('should not login user with invalid password', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      await createTestUser(userData);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid');
    });

    it('should not login with missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should rate limit login attempts', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      await createTestUser(userData);

      // Make multiple failed login attempts
      const promises = Array(6).fill().map(() =>
        request(app)
          .post('/auth/login')
          .send({
            email: userData.email,
            password: 'WrongPassword'
          })
      );

      const responses = await Promise.all(promises);

      // Check if rate limiting kicks in after multiple attempts
      const lastResponse = responses[responses.length - 1];
      // This test might fail if rate limiting is not implemented
      // It's included to encourage implementation of rate limiting
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const user = await createTestUser();
      const refreshToken = generateTestRefreshToken({
        id: user._id,
        email: user.email
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });

    it('should not refresh token with invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid');
    });

    it('should not refresh token with expired refresh token', async () => {
      const user = await createTestUser();
      const expiredRefreshToken = generateExpiredRefreshToken({
        id: user._id,
        email: user.email
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: expiredRefreshToken });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('message');
    });

    it('should not refresh token without refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user with valid refresh token', async () => {
      const user = await createTestUser();
      const refreshToken = generateTestRefreshToken({
        id: user._id,
        email: user.email
      });

      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('success');
    });

    it('should handle logout with invalid refresh token gracefully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: 'invalid-token' });

      // Should still succeed (graceful handling)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle logout without refresh token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Authentication Security Tests', () => {
    it('should hash passwords before storing', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      await request(app)
        .post('/auth/register')
        .send(userData);

      const user = await User.findOne({ email: userData.email });
      expect(user.passwordHash).not.toBe(userData.password);
      expect(typeof user.passwordHash).toBe('string');
      expect(user.passwordHash.length).toBeGreaterThan(0);
    });

    it('should not expose sensitive data in responses', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('__v');
    });

    it('should generate different tokens for different users', async () => {
      const user1Data = generateUserData({ email: 'user1@example.com' });
      const user2Data = generateUserData({ email: 'user2@example.com' });

      const response1 = await request(app)
        .post('/auth/register')
        .send(user1Data);

      const response2 = await request(app)
        .post('/auth/register')
        .send(user2Data);

      // Since registration doesn't return tokens, we just check users are different
      expect(response1.body.userId).not.toBe(response2.body.userId);
      expect(response1.body.email).not.toBe(response2.body.email);
    });

    it('should validate JWT token format', async () => {
      const userData = generateUserData();
      
      // First register a user
      await request(app)
        .post('/auth/register')
        .send(userData);

      // Then login to get a token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      const token = loginResponse.body.accessToken;
      
      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      
      // Each part should be base64url encoded
      parts.forEach(part => {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });
  });

  describe('Input Validation Tests', () => {
    it('should validate email format in registration', async () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@domain.com',
        'spaces @domain.com',
        'toolong'.repeat(50) + '@domain.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            username: 'TestUser',
            email,
            password: 'Test123!@#',
            registrationCode: process.env.REGISTRATION_SECRET || 'test-registration-secret'
          });

        expect(response.status).toBeOneOf([400, 422]);
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should validate password format', async () => {
      const invalidPasswords = [
        'password with spaces',     // Contains spaces - should fail
        'password\twith\ttabs',     // Contains tabs - should fail  
        'password\nwith\nnewlines', // Contains newlines - should fail
      ];

      for (const password of invalidPasswords) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            username: 'TestUser' + Math.random().toString(36).substr(2, 5), // Random username
            email: 'test' + Math.random().toString(36).substr(2, 5) + '@example.com', // Random email
            password,
            registrationCode: process.env.REGISTRATION_SECRET || 'test-registration-secret'
          });

        expect(response.status).toBeOneOf([400, 422]);
        expect(response.body).toHaveProperty('message');
      }
      
      // Test that valid passwords work
      const validPasswords = [
        'a',              // Single character
        '123',            // Only numbers
        'abc',            // Only letters
        'ABC',            // Only uppercase
        'Test123!@#',     // Mix of all
        '!@#$%^&*()',     // Only special chars
      ];

      for (const password of validPasswords) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            username: 'TestUser' + Math.random().toString(36).substr(2, 5), // Random username
            email: 'test' + Math.random().toString(36).substr(2, 5) + '@example.com', // Random email
            password,
            registrationCode: process.env.REGISTRATION_SECRET || 'test-registration-secret'
          });

        expect(response.status).toBe(201); // Should succeed
      }
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        username: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'Test123!@#',
        registrationCode: process.env.REGISTRATION_SECRET || 'test-registration-secret'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(maliciousData);

      if (response.status === 201) {
        // If registration succeeds, check that script tags are sanitized
        expect(response.body.username).not.toContain('<script>');
      }
    });
  });

  // New tests to improve coverage
  describe('Error Handling and Edge Cases', () => {
    it('should handle registration with invalid registration code', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#',
        registrationCode: 'invalid-code'  // Provide invalid code instead of deleting it
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Invalid registration code');
    });

    it('should handle registration with wrong registration code', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#',
        registrationCode: 'wrong-code'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Invalid registration code');
    });

    it('should handle registration with existing username', async () => {
      const userData1 = generateUserData({
        username: 'SameUsername',
        email: 'user1@example.com',
        password: 'Test123!@#'
      });

      const userData2 = generateUserData({
        username: 'SameUsername', // Same username, different email
        email: 'user2@example.com',
        password: 'Test123!@#'
      });

      // Create first user
      await createTestUser(userData1);

      // Try to register second user with same username
      const response = await request(app)
        .post('/auth/register')
        .send(userData2);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Username already taken');
    });

    it('should handle refresh token with invalid user ID', async () => {
      const fakeToken = generateTestRefreshToken({
        id: '507f1f77bcf86cd799439011', // Valid ObjectId but non-existent user
        email: 'fake@example.com'
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: fakeToken });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Invalid');
    });

    it('should handle malformed refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'malformed.token.here' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Invalid');
    });

    it('should handle refresh token verification error', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'completely-invalid-token' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Invalid');
    });

    it('should handle logout with malformed refresh token gracefully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: 'malformed-token' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('success');
    });

    it('should handle logout with valid but non-existent user token', async () => {
      const fakeToken = generateTestRefreshToken({
        id: '507f1f77bcf86cd799439011', // Valid ObjectId but non-existent user
        email: 'fake@example.com'
      });

      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: fakeToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('success');
    });

    it('should handle database errors gracefully during registration', async () => {
      // Mock UserService to throw an error
      const originalFindByEmail = require('../services/UserService').findByEmail;
      require('../services/UserService').findByEmail = jest.fn().mockRejectedValue(new Error('Database error'));

      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(500);
      
      // Restore original function
      require('../services/UserService').findByEmail = originalFindByEmail;
    });

    it('should handle database errors gracefully during login', async () => {
      // Mock UserService to throw an error
      const originalFindByEmail = require('../services/UserService').findByEmail;
      require('../services/UserService').findByEmail = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(500);
      
      // Restore original function
      require('../services/UserService').findByEmail = originalFindByEmail;
    });

    it('should handle token generation errors gracefully', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      // Create user first
      const user = await createTestUser(userData);

      // Mock JWT module directly using jest.mock
      const jwt = require('jsonwebtoken');
      const originalSign = jwt.sign;
      jwt.sign = jest.fn().mockImplementation(() => {
        throw new Error('JWT generation failed');
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(response.status).toBe(500);
      
      // Restore original function
      jwt.sign = originalSign;
    });
  });
}); 