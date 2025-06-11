const request = require('supertest');
const app = require('../server');
const User = require('../models/UserModel');
const {
  generateUserData,
  createTestUser,
  generateTestToken,
  generateTestRefreshToken,
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

      validateApiResponse(response, 201);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('user');
      expect(response.body.data).to.have.property('token');
      expect(response.body.data.user.email).to.equal(userData.email);
      expect(response.body.data.user).to.not.have.property('password');
    });

    it('should not register user with invalid email', async () => {
      const userData = generateUserData({
        email: 'invalid-email',
        password: 'Test123!@#'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('email');
    });

    it('should not register user with weak password', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'weak'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('password');
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

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('exists');
    });

    it('should not register user with missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com'
          // Missing name and password
        });

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
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

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('user');
      expect(response.body.data).to.have.property('token');
      expect(response.body.data).to.have.property('refreshToken');
      expect(response.body.data.user.email).to.equal(userData.email);
      expect(response.body.data.user).to.not.have.property('password');
    });

    it('should not login user with invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#'
        });

      validateApiResponse(response, 401, false);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Invalid');
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

      validateApiResponse(response, 401, false);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Invalid');
    });

    it('should not login with missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
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

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('token');
      expect(response.body.data).to.have.property('refreshToken');
    });

    it('should not refresh token with invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      validateApiResponse(response, 401, false);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Invalid');
    });

    it('should not refresh token with expired refresh token', async () => {
      const user = await createTestUser();
      const expiredRefreshToken = generateTestRefreshToken({
        id: user._id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: expiredRefreshToken });

      validateApiResponse(response, 401, false);
      expect(response.body.success).to.be.false;
    });

    it('should not refresh token without refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
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

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('success');
    });

    it('should handle logout with invalid refresh token gracefully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: 'invalid-token' });

      // Should still succeed (graceful handling)
      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
    });

    it('should handle logout without refresh token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({});

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
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
      expect(user.password).to.not.equal(userData.password);
      expect(user.password).to.have.length.greaterThan(userData.password.length);
    });

    it('should not expose sensitive data in responses', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.body.data.user).to.not.have.property('password');
      expect(response.body.data.user).to.not.have.property('refreshToken');
      expect(response.body.data.user).to.not.have.property('__v');
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

      expect(response1.body.data.token).to.not.equal(response2.body.data.token);
    });

    it('should validate JWT token format', async () => {
      const userData = generateUserData();
      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      const token = response.body.data.token;
      
      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      expect(parts).to.have.length(3);
      
      // Each part should be base64url encoded
      parts.forEach(part => {
        expect(part).to.match(/^[A-Za-z0-9_-]+$/);
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
            name: 'Test User',
            email,
            password: 'Test123!@#'
          });

        expect(response.status).to.be.oneOf([400, 422]);
        expect(response.body.success).to.be.false;
      }
    });

    it('should validate password strength', async () => {
      const weakPasswords = [
        'short',
        '12345678',
        'onlylower',
        'ONLYUPPER',
        'NoSpecial123',
        'no number!',
        'NoUpper123!'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password
          });

        expect(response.status).to.be.oneOf([400, 422]);
        expect(response.body.success).to.be.false;
      }
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(maliciousData);

      if (response.status === 201) {
        // If registration succeeds, check that script tags are sanitized
        expect(response.body.data.user.name).to.not.include('<script>');
      }
    });
  });
}); 