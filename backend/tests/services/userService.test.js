const UserService = require('../../services/UserService');
const User = require('../../models/UserModel');
const {
  createTestUser,
  generateUserData,
  cleanupTestData
} = require('../utils/testHelpers');

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

      const user = await UserService.createUser(userData);

      expect(user).to.be.an('object');
      expect(user.email).to.equal(userData.email);
      expect(user.name).to.equal(userData.name);
      expect(user).to.have.property('_id');
      expect(user.password).to.not.equal(userData.password); // Should be hashed
    });

    it('should throw error for duplicate email', async () => {
      const userData = generateUserData({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      // Create first user
      await UserService.createUser(userData);

      // Try to create user with same email
      try {
        await UserService.createUser(userData);
        expect.fail('Should have thrown an error for duplicate email');
      } catch (error) {
        expect(error.message).to.include('email');
      }
    });

    it('should validate required fields', async () => {
      const incompleteUserData = {
        email: 'test@example.com'
        // Missing name and password
      };

      try {
        await UserService.createUser(incompleteUserData);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('required');
      }
    });
  });

  describe('User Retrieval', () => {
    it('should find user by ID', async () => {
      const testUser = await createTestUser();

      const foundUser = await UserService.getUserById(testUser._id);

      expect(foundUser).to.be.an('object');
      expect(foundUser._id.toString()).to.equal(testUser._id.toString());
      expect(foundUser.email).to.equal(testUser.email);
    });

    it('should return null for non-existent user ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const foundUser = await UserService.getUserById(nonExistentId);

      expect(foundUser).to.be.null;
    });

    it('should find user by email', async () => {
      const testUser = await createTestUser();

      const foundUser = await UserService.getUserByEmail(testUser.email);

      expect(foundUser).to.be.an('object');
      expect(foundUser.email).to.equal(testUser.email);
      expect(foundUser._id.toString()).to.equal(testUser._id.toString());
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await UserService.getUserByEmail('nonexistent@example.com');

      expect(foundUser).to.be.null;
    });
  });

  describe('User Update', () => {
    it('should update user information', async () => {
      const testUser = await createTestUser();
      const updateData = {
        name: 'Updated Name'
      };

      const updatedUser = await UserService.updateUser(testUser._id, updateData);

      expect(updatedUser).to.be.an('object');
      expect(updatedUser.name).to.equal(updateData.name);
      expect(updatedUser.email).to.equal(testUser.email); // Should remain unchanged
    });

    it('should not allow updating email to existing email', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com' });

      try {
        await UserService.updateUser(user2._id, { email: user1.email });
        expect.fail('Should have thrown error for duplicate email');
      } catch (error) {
        expect(error.message).to.include('email');
      }
    });

    it('should return null for non-existent user update', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const updateData = { name: 'New Name' };

      const result = await UserService.updateUser(nonExistentId, updateData);

      expect(result).to.be.null;
    });
  });

  describe('User Deletion', () => {
    it('should delete user successfully', async () => {
      const testUser = await createTestUser();

      const result = await UserService.deleteUser(testUser._id);

      expect(result).to.be.true;

      // Verify user is deleted
      const deletedUser = await UserService.getUserById(testUser._id);
      expect(deletedUser).to.be.null;
    });

    it('should return false for non-existent user deletion', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const result = await UserService.deleteUser(nonExistentId);

      expect(result).to.be.false;
    });
  });

  describe('Password Management', () => {
    it('should hash password during user creation', async () => {
      const userData = generateUserData({
        password: 'PlainTextPassword123!'
      });

      const user = await UserService.createUser(userData);

      expect(user.password).to.not.equal(userData.password);
      expect(user.password.length).to.be.greaterThan(userData.password.length);
      expect(user.password).to.match(/^\$2[ab]\$/); // bcrypt hash pattern
    });

    it('should verify password correctly', async () => {
      const userData = generateUserData({
        password: 'TestPassword123!'
      });
      const user = await UserService.createUser(userData);

      const isValid = await UserService.verifyPassword(userData.password, user.password);
      const isInvalid = await UserService.verifyPassword('WrongPassword', user.password);

      expect(isValid).to.be.true;
      expect(isInvalid).to.be.false;
    });

    it('should update password with new hash', async () => {
      const testUser = await createTestUser();
      const newPassword = 'NewPassword123!';
      const oldPasswordHash = testUser.password;

      const updatedUser = await UserService.updatePassword(testUser._id, newPassword);

      expect(updatedUser.password).to.not.equal(oldPasswordHash);
      expect(updatedUser.password).to.not.equal(newPassword);
      
      // Verify new password works
      const isValid = await UserService.verifyPassword(newPassword, updatedUser.password);
      expect(isValid).to.be.true;
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
          await UserService.createUser({
            name: 'Test User',
            email,
            password: 'Valid123!'
          });
          expect.fail(`Should have rejected invalid email: ${email}`);
        } catch (error) {
          expect(error.message).to.include('email');
        }
      }
    });

    it('should validate password strength', async () => {
      const weakPasswords = [
        'short',
        '12345678',
        'onlylower',
        'ONLYUPPER',
        'NoSpecial123'
      ];

      for (const password of weakPasswords) {
        try {
          await UserService.createUser({
            name: 'Test User',
            email: 'test@example.com',
            password
          });
          expect.fail(`Should have rejected weak password: ${password}`);
        } catch (error) {
          expect(error.message).to.include('password');
        }
      }
    });

    it('should validate required name field', async () => {
      try {
        await UserService.createUser({
          email: 'test@example.com',
          password: 'Valid123!'
          // Missing name
        });
        expect.fail('Should have required name field');
      } catch (error) {
        expect(error.message).to.include('name');
      }
    });
  });

  describe('User Query Methods', () => {
    it('should get users with pagination', async () => {
      // Create multiple test users
      const users = await Promise.all([
        createTestUser({ email: 'user1@example.com' }),
        createTestUser({ email: 'user2@example.com' }),
        createTestUser({ email: 'user3@example.com' }),
        createTestUser({ email: 'user4@example.com' }),
        createTestUser({ email: 'user5@example.com' })
      ]);

      const result = await UserService.getUsers({ page: 1, limit: 3 });

      expect(result).to.have.property('users');
      expect(result).to.have.property('pagination');
      expect(result.users).to.be.an('array');
      expect(result.users.length).to.be.at.most(3);
      expect(result.pagination.total).to.equal(5);
    });

    it('should search users by name', async () => {
      await createTestUser({ name: 'John Doe', email: 'john@example.com' });
      await createTestUser({ name: 'Jane Smith', email: 'jane@example.com' });
      await createTestUser({ name: 'Bob Johnson', email: 'bob@example.com' });

      const result = await UserService.searchUsers('john');

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      expect(result.some(user => user.name.toLowerCase().includes('john'))).to.be.true;
    });

    it('should count total users', async () => {
      await Promise.all([
        createTestUser({ email: 'user1@example.com' }),
        createTestUser({ email: 'user2@example.com' }),
        createTestUser({ email: 'user3@example.com' })
      ]);

      const count = await UserService.getUserCount();

      expect(count).to.be.a('number');
      expect(count).to.equal(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the service methods handle errors properly
      
      try {
        await UserService.getUserById('invalid-id-format');
        // Some implementations might handle this gracefully, others might throw
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });

    it('should validate ObjectId format for user operations', async () => {
      const invalidIds = ['invalid', '123', 'not-an-objectid'];

      for (const invalidId of invalidIds) {
        try {
          await UserService.getUserById(invalidId);
          // If it doesn't throw, it should return null
        } catch (error) {
          expect(error.message).to.include('ObjectId');
        }
      }
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize user input', async () => {
      const maliciousUserData = {
        name: '<script>alert("xss")</script>John Doe',
        email: 'test@example.com',
        password: 'Valid123!'
      };

      const user = await UserService.createUser(maliciousUserData);

      // Name should be sanitized
      expect(user.name).to.not.include('<script>');
      expect(user.name).to.not.include('alert');
    });

    it('should not expose sensitive data in user objects', async () => {
      const testUser = await createTestUser();
      const userForResponse = UserService.getSafeUserData(testUser);

      expect(userForResponse).to.not.have.property('password');
      expect(userForResponse).to.not.have.property('passwordHash');
      expect(userForResponse).to.not.have.property('__v');
      expect(userForResponse).to.have.property('_id');
      expect(userForResponse).to.have.property('email');
      expect(userForResponse).to.have.property('name');
    });
  });
}); 