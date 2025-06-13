const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // Default to 1 hour
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Default to 7 days

const logger = require('../config/logger');

/**
 * Generates an access token.
 * @param {object} payload - The payload to include in the token (typically user ID).
 * @returns {string} The generated JWT access token.
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generates a refresh token.
 * @param {object} payload - The payload to include in the token (typically user ID).
 * @returns {string} The generated JWT refresh token.
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN }); // Potentially use a different secret for refresh tokens
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token to verify.
 * @returns {object|null} The decoded payload if verification is successful, otherwise null.
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    // Handle specific errors like TokenExpiredError, JsonWebTokenError if needed
    logger.error('JWT Verification Error:', {
      message: error.message,
      name: error.name,
      token: token ? `${token.substring(0, 20)}...` : 'null'
    });
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  JWT_EXPIRES_IN, // Exporting for potential use elsewhere (e.g., setting cookie expiry)
  JWT_REFRESH_EXPIRES_IN
}; 