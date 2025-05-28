const BaseService = require('./BaseService');
const User = require('../models/UserModel');
const logger = require('../config/logger');

class UserService extends BaseService {
  constructor() {
    super(User); // Pass the User model to the BaseService constructor
  }

  /**
   * Finds a user by their email address.
   * @param {string} email - The email of the user to find.
   * @returns {Promise<object|null>} The found user document or null.
   */
  async findByEmail(email) {
    try {
      logger.debug(`Finding user by email: ${email}`);
      const user = await this.model.findOne({ email });
      if (user) {
        logger.debug(`User found with email: ${email}`);
      } else {
        logger.debug(`No user found with email: ${email}`);
      }
      return user;
    } catch (error) {
      logger.error(`Error finding user by email ${email}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Creates a new user.
   * The password in the data should be the plain text password.
   * It will be hashed by the pre-save hook in the UserModel.
   * @param {object} userData - Data for the new user (username, email, passwordHash, etc.).
   * @returns {Promise<object>} The created user document (passwordHash will be hashed).
   */
  async createUser(userData) {
    // The password hashing is handled by the pre('save') hook in UserModel.js
    // So, we can call the generic create method from BaseService.
    // Ensure userData contains passwordHash (as plain text initially, to be hashed by model hook)
    logger.info(`Attempting to create user with email: ${userData.email}`);
    return this.create(userData);
  }
  
  // You can add more user-specific methods here if needed
}

module.exports = new UserService(); // Export a singleton instance 