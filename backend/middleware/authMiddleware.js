const { verifyToken } = require('../utils/jwtUtils');
const User = require('../models/UserModel'); // Assuming you have a User model
const logger = require('../config/logger');

/**
 * Middleware to protect routes that require authentication.
 * Verifies the JWT token from the Authorization header.
 * If valid, attaches the user object to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.toLowerCase().startsWith('bearer')
  ) {
    try {
      // Get token from header (e.g., "Bearer TOKEN_STRING")
      // Handle multiple spaces and case insensitive Bearer
      const parts = req.headers.authorization.split(' ').filter(part => part.length > 0);
      token = parts[1];
      
      // If no token after Bearer, treat as no token
      if (!token) {
        logger.warn('No token provided for protected route');
        return res.status(401).json({ message: 'Not authorized, no token' });
      }

      // Verify token
      const decoded = verifyToken(token);

      if (!decoded) {
        logger.warn('JWT verification failed or token expired');
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Get user from the token payload (assuming payload has id)
      // Exclude passwordHash from the user object attached to the request
      const userDoc = await User.findById(decoded.id).select('-passwordHash -__v');
      
      // Convert to plain object to properly exclude selected fields
      req.user = userDoc ? userDoc.toObject() : null; 

      if (!req.user) {
        logger.warn(`User not found for token ID: ${decoded.id}`);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      next();
    } catch (error) {
      logger.error('Error in auth middleware:', error);
      return res.status(401).json({ message: 'Not authorized, token processing error' });
    }
  }

  if (!token) {
    logger.warn('No token provided for protected route');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect }; 