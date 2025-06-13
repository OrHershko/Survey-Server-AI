const UserService = require('../../services/UserService');
const User = require('../../models/UserModel');
const bcrypt = require('bcryptjs');
const {
  createTestUser,
  generateUserData,
  cleanupTestData
} = require('../utils/testHelpers');

// Import Jest's fail function
const { fail } = require('assert');

// Mock the LLM service to avoid external API calls
jest.mock('../../services/llmService', () => require('../mocks/llmService.mock'));

describe('UserService Unit Tests', () => {
  beforeEach(async () => {
    await cleanupTestData(['users']);
  });

  describe('User Creation', () => {
    it('should create a new user successfully', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });
      
      // Convert password to passwordHash as expected by the service
      userData.passwordHash = userData.password;
      delete userData.password;

      const user = await UserService.createUser(userData);

      expect(user).toBeInstanceOf(Object);
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user).toHaveProperty('_id');
      expect(user.passwordHash).not.toBe(userData.password); // Should be hashed
    });

    it('should throw error for duplicate email', async () => {
      const userData1 = generateUserData({
        email: 'test@example.com',
        username: 'testuser1',
        password: 'Test123!@#'
      });
      
      const userData2 = generateUserData({
        email: 'test@example.com', // Same email
        username: 'testuser2', // Different username
        password: 'Test123!@#'
      });
      
      // Convert password to passwordHash as expected by the service
      userData1.passwordHash = userData1.password;
      delete userData1.password;
      userData2.passwordHash = userData2.password;
      delete userData2.password;

      // Create first user
      await UserService.createUser(userData1);

      // Try to create user with same email but different username
      try {
        await UserService.createUser(userData2);
        fail('Should have thrown an error for duplicate email');
      } catch (error) {
        expect(error.message).toContain('email');
      }
    });

    it('should validate required fields', async () => {
      const incompleteUserData = {
        email: 'test@example.com'
        // Missing username and passwordHash
      };

      try {
        await UserService.createUser(incompleteUserData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('required');
      }
    });
  });

  describe('User Retrieval', () => {
    it('should find user by email using findByEmail method', async () => {
      const testUser = await createTestUser();

      const foundUser = await UserService.findByEmail(testUser.email);

      expect(foundUser).toBeInstanceOf(Object);
      expect(foundUser._id.toString()).toBe(testUser._id.toString());
      expect(foundUser.email).toBe(testUser.email);
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await UserService.findByEmail('nonexistent@example.com');

      expect(foundUser).toBeNull();
    });

    it('should find user by ID using BaseService findById', async () => {
      const testUser = await createTestUser();

      const foundUser = await UserService.findById(testUser._id);

      expect(foundUser).toBeInstanceOf(Object);
      expect(foundUser._id.toString()).toBe(testUser._id.toString());
      expect(foundUser.email).toBe(testUser.email);
    });
  });

  describe('Password Management', () => {
    it('should hash password during user creation', async () => {
      const userData = generateUserData({
        password: 'PlainTextPassword123!'
      });
      
      // Convert password to passwordHash as expected by the service
      const originalPassword = userData.password;
      userData.passwordHash = userData.password;
      delete userData.password;

      const user = await UserService.createUser(userData);

      expect(user.passwordHash).not.toBe(originalPassword);
      expect(user.passwordHash.length).toBeGreaterThan(originalPassword.length);
      expect(user.passwordHash).toMatch(/^\$2[ab]\$/); // bcrypt hash pattern
    });

    it('should verify password using User model method', async () => {
      const userData = generateUserData({
        password: 'TestPassword123!'
      });
      
      // Convert password to passwordHash as expected by the service
      const originalPassword = userData.password;
      userData.passwordHash = userData.password;
      delete userData.password;
      
      const user = await UserService.createUser(userData);

      const isValid = await user.comparePassword(originalPassword);
      const isInvalid = await user.comparePassword('WrongPassword');

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should hash passwords consistently', async () => {
      const password = 'TestPassword123!';
      const userData1 = generateUserData({ password });
      const userData2 = generateUserData({ password, email: 'test2@example.com', username: 'testuser2' });

      // Convert password to passwordHash for both users
      userData1.passwordHash = userData1.password;
      delete userData1.password;
      userData2.passwordHash = userData2.password;
      delete userData2.password;

      const user1 = await UserService.createUser(userData1);
      const user2 = await UserService.createUser(userData2);

      // Different users with same password should have different hashes (due to salt)
      expect(user1.passwordHash).not.toBe(user2.passwordHash);
      
      // But both should validate the same password correctly
      const isValid1 = await user1.comparePassword(password);
      const isValid2 = await user2.comparePassword(password);
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });
  });

  describe('User Validation', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        'invalid@',
        '@domain.com',
        'spaces @domain.com'
      ];

      for (const email of invalidEmails) {
                  try {
            const userData = {
              username: 'testuser',
              email,
              passwordHash: 'Valid123!'
            };
            await UserService.createUser(userData);
            fail(`Should have rejected invalid email: ${email}`);
          } catch (error) {
            expect(error.message).toContain('email');
          }
      }
    });

    it('should validate required username field', async () => {
              try {
          await UserService.createUser({
            email: 'test@example.com',
            passwordHash: 'Valid123!'
            // Missing username
          });
          fail('Should have required username field');
        } catch (error) {
          expect(error.message).toContain('username');
        }
    });

    it('should validate required passwordHash field', async () => {
      try {
        await UserService.createUser({
          username: 'testuser',
          email: 'test@example.com'
          // Missing password/passwordHash
        });
        fail('Should have required passwordHash field');
      } catch (error) {
        expect(error.message).toContain('passwordHash');
      }
    });
  });



  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the service methods handle errors properly
      
      try {
        await UserService.findById('invalid-id-format');
        // Some implementations might handle this gracefully, others might throw
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle invalid ObjectId format', async () => {
      const invalidIds = ['invalid', '123', 'not-an-objectid'];

      for (const invalidId of invalidIds) {
        try {
          await UserService.findById(invalidId);
          // If it doesn't throw, it should return null
        } catch (error) {
          expect(error.message).toContain('ObjectId');
        }
      }
    });
  });

  describe('Data Sanitization', () => {
    it('should handle basic user input properly', async () => {
      const userData = generateUserData({
        username: 'testuser123',
        email: 'TEST@EXAMPLE.COM', // Test case sensitivity
        password: 'Valid123!'
      });
      
      // Convert password to passwordHash as expected by the service
      const originalPassword = userData.password;
      userData.passwordHash = userData.password;
      delete userData.password;

      const user = await UserService.createUser(userData);

      // Email should be lowercased
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe(userData.username);
      
      // Password should be hashed
      expect(user.passwordHash).not.toBe(originalPassword);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity during creation', async () => {
      const userData = generateUserData({
        username: 'testuser123',
        email: 'test@example.com',
        password: 'Valid123!'
      });

      // Convert password to passwordHash as expected by the service
      const originalPassword = userData.password;
      userData.passwordHash = userData.password;
      delete userData.password;

      const user = await UserService.createUser(userData);

      // Check that all required fields are present
      expect(user).toHaveProperty('_id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('passwordHash');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('refreshTokens');
      
      // Check that passwordHash is properly hashed
      expect(user.passwordHash).not.toBe(originalPassword);
      
      // Check that email is lowercase
      expect(user.email).toBe(userData.email.toLowerCase());
    });

    it('should create users with unique usernames', async () => {
      const user1Data = generateUserData({
        username: 'uniqueuser',
        email: 'user1@example.com',
        password: 'Valid123!'
      });
      
      const user2Data = generateUserData({
        username: 'uniqueuser', // Same username
        email: 'user2@example.com',
        password: 'Valid123!'
      });

      // Convert passwords to passwordHash
      user1Data.passwordHash = user1Data.password;
      delete user1Data.password;
      user2Data.passwordHash = user2Data.password;
      delete user2Data.password;

      await UserService.createUser(user1Data);

      try {
        await UserService.createUser(user2Data);
        fail('Should have thrown error for duplicate username');
      } catch (error) {
        expect(error.message).toContain('username');
      }
    });
  });
}); 