const faker = require('faker');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../models/UserModel');
const Survey = require('../../models/SurveyModel');

/**
 * Test data generation utilities
 */

/**
 * Generate a test user object
 * @param {object} overrides - Fields to override
 * @returns {object} User data
 */
const generateUserData = (overrides = {}) => ({
  username: faker.internet.userName().replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) || 'testuser123',
  email: faker.internet.email(),
  password: 'Test123!@#',
  registrationCode: process.env.REGISTRATION_SECRET || 'test-registration-secret',
  ...overrides
});

/**
 * Generate a test survey object
 * @param {object} overrides - Fields to override
 * @returns {object} Survey data
 */
const generateSurveyData = (overrides = {}) => ({
  title: faker.lorem.sentence(),
  question: faker.lorem.sentence() + '?',
  guidelines: faker.lorem.sentences(3),
  area: faker.commerce.department(),
  expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  permittedResponses: faker.datatype.number({ min: 10, max: 100 }),
  ...overrides
});

/**
 * Generate a test survey response
 * @param {object} overrides - Fields to override
 * @returns {object} Response data
 */
const generateResponseData = (overrides = {}) => ({
  text: faker.lorem.paragraph(),
  ...overrides
});

/**
 * Create a test user in the database
 * @param {object} userData - User data
 * @returns {Promise<object>} Created user
 */
const createTestUser = async (userData = {}) => {
  const data = generateUserData(userData);
  
  // Convert password to passwordHash for the User model
  if (data.password) {
    data.passwordHash = data.password;
    delete data.password;
  }
  
  const user = new User(data);
  return await user.save();
};

/**
 * Create a test survey in the database
 * @param {string} creatorId - ID of the survey creator
 * @param {object} surveyData - Survey data
 * @returns {Promise<object>} Created survey
 */
const createTestSurvey = async (creatorId, surveyData = {}) => {
  const data = generateSurveyData({
    creator: creatorId,
    ...surveyData
  });
  
  const survey = new Survey(data);
  return await survey.save();
};

/**
 * Generate a JWT token for testing
 * @param {object} payload - Token payload
 * @returns {string} JWT token
 */
const generateTestToken = (payload = {}) => {
  const defaultPayload = {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    ...payload
  };
  
  return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: process.env.JWT_EXPIRE || '1h'
  });
};

/**
 * Generate a refresh token for testing
 * @param {object} payload - Token payload
 * @returns {string} Refresh token
 */
const generateTestRefreshToken = (payload = {}) => {
  const defaultPayload = {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    ...payload
  };
  
  // Remove exp from payload if present to avoid conflict with expiresIn
  const { exp, ...cleanPayload } = defaultPayload;
  
  return jwt.sign(cleanPayload, process.env.JWT_REFRESH_SECRET || 'test-refresh-secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
};

/**
 * Generate an expired refresh token for testing
 * @param {object} payload - Token payload
 * @returns {string} Expired refresh token
 */
const generateExpiredRefreshToken = (payload = {}) => {
  const defaultPayload = {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    ...payload
  };
  
  return jwt.sign(defaultPayload, process.env.JWT_REFRESH_SECRET || 'test-refresh-secret');
};

/**
 * Create an authenticated request context for testing
 * @param {object} user - User object
 * @returns {object} Request context with auth headers
 */
const createAuthContext = (user) => {
  const token = generateTestToken({
    id: user._id,
    email: user.email
  });
  
  return {
    headers: {
      Authorization: `Bearer ${token}`
    },
    user
  };
};

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate multiple test objects
 * @param {Function} generator - Generator function
 * @param {number} count - Number of objects to generate
 * @param {object} overrides - Common overrides for all objects
 * @returns {Array} Array of generated objects
 */
const generateMultiple = (generator, count, overrides = {}) => {
  return Array.from({ length: count }, () => generator(overrides));
};

/**
 * Clean up test data (useful for test teardown)
 * @param {Array<string>} collections - Collection names to clean
 */
const cleanupTestData = async (collections = ['users', 'surveys']) => {
  const mongoose = require('mongoose');
  
  for (const collectionName of collections) {
    if (mongoose.connection.collections[collectionName]) {
      await mongoose.connection.collections[collectionName].deleteMany({});
    }
  }
};

/**
 * Create a complete test scenario with user and survey
 * @param {object} options - Configuration options
 * @returns {Promise<object>} Test scenario data
 */
const createTestScenario = async (options = {}) => {
  const {
    userCount = 1,
    surveyCount = 1,
    responseCount = 0,
    userOverrides = {},
    surveyOverrides = {},
    responseOverrides = {}
  } = options;
  
  // Create users
  const users = [];
  for (let i = 0; i < userCount; i++) {
    const user = await createTestUser(userOverrides);
    users.push(user);
  }
  
  // Create surveys
  const surveys = [];
  for (let i = 0; i < surveyCount; i++) {
    const creator = users[i % users.length]; // Distribute surveys among users
    const survey = await createTestSurvey(creator._id, surveyOverrides);
    surveys.push(survey);
  }
  
  // Create responses
  const responses = [];
  if (responseCount > 0) {
    for (let i = 0; i < responseCount; i++) {
      const user = users[i % users.length];
      const survey = surveys[i % surveys.length];
      
      // Add response to survey
      const responseData = generateResponseData(responseOverrides);
      survey.responses.push({
        user: user._id,
        text: responseData.text,
        submittedAt: new Date()
      });
      
      await survey.save();
      responses.push(survey.responses[survey.responses.length - 1]);
    }
  }
  
  return {
    users,
    surveys,
    responses,
    authContext: users.length > 0 ? createAuthContext(users[0]) : null
  };
};

/**
 * Validate API response structure
 * @param {object} response - API response object
 * @param {number} expectedStatus - Expected HTTP status code
 * @param {boolean} shouldHaveData - Whether response should have data
 * @returns {object} Response for chaining
 */
const validateApiResponse = (response, expectedStatus = 200, shouldHaveData = true) => {
  expect(response.status).toBe(expectedStatus);
  
  if (shouldHaveData) {
    expect(response.body).toBeInstanceOf(Object);
    // Different endpoints have different response structures
    // Some have 'message', some have 'surveys', some have other structures
  }
  
  return response;
};

module.exports = {
  generateUserData,
  generateSurveyData,
  generateResponseData,
  createTestUser,
  createTestSurvey,
  generateTestToken,
  generateTestRefreshToken,
  generateExpiredRefreshToken,
  createAuthContext,
  delay,
  generateMultiple,
  cleanupTestData,
  createTestScenario,
  validateApiResponse
}; 