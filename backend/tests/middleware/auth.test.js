const { protect } = require('../../middleware/authMiddleware');
const User = require('../../models/UserModel');
const { verifyToken } = require('../../utils/jwtUtils');
const {
  createTestUser,
  generateTestToken,
  cleanupTestData
} = require('../utils/testHelpers');

// Mock dependencies
jest.mock('../../utils/jwtUtils');
jest.mock('../../services/llmService', () => require('../mocks/llmService.mock'));

describe('Authentication Middleware Tests', () => {
  let req, res, next;

  beforeEach(async () => {
    await cleanupTestData(['users']);
    
    // Reset mocks and create fresh request/response objects
    jest.clearAllMocks();
    
    req = {
      headers: {},
      user: null
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
  });

  describe('protect middleware', () => {
    it('should authenticate user with valid token', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken({
        id: testUser._id,
        email: testUser.email
      });

      // Set up request with valid token
      req.headers.authorization = `Bearer ${token}`;

      // Mock verifyToken to return decoded payload
      verifyToken.mockReturnValue({
        id: testUser._id,
        email: testUser.email
      });

      await protect(req, res, next);

      expect(verifyToken).toHaveBeenCalledWith(token);
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toEqual(testUser._id.toString());
      expect(req.user.email).toEqual(testUser.email);
      expect(req.user).not.toHaveProperty('password');
      expect(req.user).not.toHaveProperty('passwordHash');
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      // No authorization header
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized, no token'
      });
      expect(next).not.toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('should reject request with invalid authorization format', async () => {
      // Invalid format (missing "Bearer")
      req.headers.authorization = 'InvalidFormat token123';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized, no token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', async () => {
      const token = 'expired.jwt.token';
      req.headers.authorization = `Bearer ${token}`;

      // Mock verifyToken to return null (expired/invalid token)
      verifyToken.mockReturnValue(null);

      await protect(req, res, next);

      expect(verifyToken).toHaveBeenCalledWith(token);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized, token failed'
      });
      expect(next).not.toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('should reject request with invalid token', async () => {
      const token = 'invalid.jwt.token';
      req.headers.authorization = `Bearer ${token}`;

      // Mock verifyToken to throw error
      verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await protect(req, res, next);

      expect(verifyToken).toHaveBeenCalledWith(token);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized, token processing error'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request when user not found in database', async () => {
      const nonExistentUserId = '507f1f77bcf86cd799439011';
      const token = generateTestToken({
        id: nonExistentUserId,
        email: 'nonexistent@example.com'
      });

      req.headers.authorization = `Bearer ${token}`;

      // Mock verifyToken to return valid payload for non-existent user
      verifyToken.mockReturnValue({
        id: nonExistentUserId,
        email: 'nonexistent@example.com'
      });

      await protect(req, res, next);

      expect(verifyToken).toHaveBeenCalledWith(token);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized, user not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle different token formats', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken({
        id: testUser._id,
        email: testUser.email
      });

      const validFormats = [
        `Bearer ${token}`,
        `bearer ${token}`, // lowercase
        `BEARER ${token}`  // uppercase
      ];

      for (const authHeader of validFormats) {
        // Reset for each iteration
        req.headers.authorization = authHeader;
        req.user = null;
        jest.clearAllMocks();

        verifyToken.mockReturnValue({
          id: testUser._id,
          email: testUser.email
        });

        await protect(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.user).toBeDefined();
        expect(res.status).not.toHaveBeenCalled();
      }
    });

    it('should extract token correctly from different Bearer formats', async () => {
      const testUser = await createTestUser();
      const token = 'sample.jwt.token';

      const testCases = [
        { auth: `Bearer ${token}`, expectedToken: token },
        { auth: `Bearer  ${token}`, expectedToken: token }, // extra space
        { auth: `bearer ${token}`, expectedToken: token }   // lowercase
      ];

      for (const testCase of testCases) {
        req.headers.authorization = testCase.auth;
        jest.clearAllMocks();

        verifyToken.mockReturnValue({
          id: testUser._id,
          email: testUser.email
        });

        await protect(req, res, next);

        expect(verifyToken).toHaveBeenCalledWith(testCase.expectedToken);
      }
    });

    it('should not expose sensitive user data', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken({
        id: testUser._id,
        email: testUser.email
      });

      req.headers.authorization = `Bearer ${token}`;

      verifyToken.mockReturnValue({
        id: testUser._id,
        email: testUser.email
      });

      await protect(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user).not.toHaveProperty('password');
      expect(req.user).not.toHaveProperty('passwordHash');
      expect(req.user).not.toHaveProperty('__v');
      expect(req.user).toHaveProperty('_id');
      expect(req.user).toHaveProperty('email');
      expect(req.user).toHaveProperty('username');
    });

    it('should handle concurrent authentication requests', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken({
        id: testUser._id,
        email: testUser.email
      });

      // Create multiple request objects
      const requests = Array(5).fill().map(() => ({
        headers: { authorization: `Bearer ${token}` },
        user: null
      }));

      const responses = requests.map(() => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }));

      const nexts = requests.map(() => jest.fn());

      verifyToken.mockReturnValue({
        id: testUser._id,
        email: testUser.email
      });

      // Process all requests concurrently
      const promises = requests.map((req, index) =>
        protect(req, responses[index], nexts[index])
      );

      await Promise.all(promises);

      // All should succeed
      nexts.forEach(next => {
        expect(next).toHaveBeenCalledWith();
      });

      responses.forEach(res => {
        expect(res.status).not.toHaveBeenCalled();
      });

      requests.forEach(req => {
        expect(req.user).toBeDefined();
        expect(req.user._id.toString()).toEqual(testUser._id.toString());
      });
    });

    it('should handle database errors gracefully', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      verifyToken.mockReturnValue({
        id: 'valid-id',
        email: 'test@example.com'
      });

      // Mock User.findById to throw database error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        const error = new Error('Database connection error');
        return {
          select: jest.fn().mockRejectedValue(error)
        };
      });

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized, token processing error'
      });
      expect(next).not.toHaveBeenCalled();

      // Restore original method
      User.findById = originalFindById;
    });

    it('should validate token payload structure', async () => {
      const token = 'valid.format.token';
      req.headers.authorization = `Bearer ${token}`;

      // Test various invalid payloads
      const invalidPayloads = [
        null,
        undefined,
        {},
        { email: 'test@example.com' }, // missing id
        { id: 'user123' }, // missing email
        { id: null, email: 'test@example.com' },
        { id: '', email: 'test@example.com' }
      ];

      for (const payload of invalidPayloads) {
        jest.clearAllMocks();
        verifyToken.mockReturnValue(payload);

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('should handle malformed JWT tokens', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'malformed',
        'Bearer',
        'Bearer ',
        'Bearer invalid-token-format',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // incomplete JWT
      ];

      for (const authHeader of malformedTokens) {
        req.headers.authorization = authHeader;
        jest.clearAllMocks();

        verifyToken.mockImplementation(() => {
          throw new Error('Malformed token');
        });

        await protect(req, res, next);

        if (authHeader.startsWith('Bearer ') && authHeader.length > 7) {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(res.json).toHaveBeenCalledWith({
            message: 'Not authorized, token processing error'
          });
        } else {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(res.json).toHaveBeenCalledWith({
            message: 'Not authorized, no token'
          });
        }
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('should maintain request context integrity', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken({
        id: testUser._id,
        email: testUser.email
      });

      // Add some existing request context
      req.originalUrl = '/api/surveys';
      req.method = 'GET';
      req.params = { id: 'survey123' };
      req.query = { page: 1 };
      req.body = { test: 'data' };

      req.headers.authorization = `Bearer ${token}`;

      verifyToken.mockReturnValue({
        id: testUser._id,
        email: testUser.email
      });

      await protect(req, res, next);

      // Should preserve existing request context
      expect(req.originalUrl).toEqual('/api/surveys');
      expect(req.method).toEqual('GET');
      expect(req.params).toEqual({ id: 'survey123' });
      expect(req.query).toEqual({ page: 1 });
      expect(req.body).toEqual({ test: 'data' });

      // Should add user to request
      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle User.findById returning null', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      verifyToken.mockReturnValue({
        id: '507f1f77bcf86cd799439011', // Valid ObjectId format but non-existent
        email: 'test@example.com'
      });

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized, user not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      // Mock verifyToken to throw unexpected error
      verifyToken.mockImplementation(() => {
        throw new TypeError('Unexpected error type');
      });

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized, token processing error'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
}); 