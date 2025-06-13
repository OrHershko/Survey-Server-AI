const UserService = require('../services/UserService');
const { registrationSchema, loginSchema } = require('../validators/userValidation');
const logger = require('../config/logger');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwtUtils');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    // 1. Validate request body
    const { error, value } = registrationSchema.validate(req.body);
    if (error) {
      logger.warn('Registration validation failed:', error.details[0].message);
      // Send a 400 Bad Request response with a clear message
      return res.status(400).json({ message: error.details[0].message });
    }

    const { username, email, password, registrationCode } = value;

    // 2. Validate registration code against environment secret
    if (registrationCode !== process.env.REGISTRATION_SECRET) {
      logger.warn('Invalid registration code attempt');
      return res.status(403).json({ message: 'Invalid registration code.' });
    }

    // 3. Check if user already exists (by email or username)
    const existingUserByEmail = await UserService.findByEmail(email);
    if (existingUserByEmail) {
      logger.warn(`Registration attempt for existing email: ${email}`);
      return res.status(409).json({ message: 'User with this email already exists.' });
    }
    //check for existing username if it also needs to be unique across all users
    const existingUserByUsername = await UserService.find({ username: username });
    if (existingUserByUsername && existingUserByUsername.length > 0) {
      logger.warn(`Registration attempt for existing username: ${username}`);
      return res.status(409).json({ message: 'Username already taken.' });
    }

    // 4. Create user record in database (password will be hashed by UserModel pre-save hook)
    const newUser = await UserService.createUser({
      username,
      email,
      passwordHash: password, // Pass the plain password to be hashed by the model
    });

    logger.info(`User registered successfully: ${newUser.email} (ID: ${newUser._id})`);

    // 5. Return success message (no JWT on registration as per plan)
    res.status(201).json({
      message: 'User registered successfully. Please log in.',
      userId: newUser._id,
      username: newUser.username,
      email: newUser.email,
    });

  } catch (error) {
    logger.error('Error in registerUser controller:', error);
    // Pass error to the centralized error handler in server.js
    // Ensure the error has a statusCode if you want to set a specific one
    if (!error.statusCode) {
      error.statusCode = 500; // Default to 500 if not set
    }
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    // 1. Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      logger.warn('Login validation failed:', error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = value;

    // 2. Find user by email
    const user = await UserService.findByEmail(email);
    if (!user) {
      logger.warn(`Login attempt for non-existent email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials.' }); // Generic message
    }

    // 3. Compare hashed passwords
    // The comparePassword method is defined in UserModel.js
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Login attempt with incorrect password for email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials.' }); // Generic message
    }

    // 4. User is authenticated, generate JWT tokens
    const accessToken = generateAccessToken({ id: user._id, username: user.username });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Store refresh token in database
    await user.addRefreshToken(refreshToken);

    logger.info(`User logged in successfully: ${user.email} (ID: ${user._id})`);

    // 5. Return tokens and user info (excluding password)
    res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        // Add other non-sensitive fields if needed
      },
      accessToken,
      refreshToken, // Client should store this securely (e.g., HttpOnly cookie)
      expiresIn: process.env.JWT_EXPIRES_IN || '1h' // Inform client about access token expiry
    });

  } catch (error) {
    logger.error('Error in loginUser controller:', error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      logger.warn('Refresh token request without token');
      return res.status(401).json({ message: 'Refresh token required.' });
    }

    // Verify refresh token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      logger.warn('Invalid refresh token provided');
      return res.status(403).json({ message: 'Invalid refresh token.' });
    }

    // Find user and validate refresh token
    const user = await UserService.findById(decoded.id);
    if (!user || !user.isValidRefreshToken(token)) {
      logger.warn(`Refresh token validation failed for user: ${decoded.id}`);
      return res.status(403).json({ message: 'Invalid refresh token.' });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({ id: user._id, username: user.username });

    logger.info(`Access token refreshed for user: ${user.email} (ID: ${user._id})`);

    res.status(200).json({
      message: 'Token refreshed successfully.',
      accessToken: newAccessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });

  } catch (error) {
    logger.error('Error in refreshToken controller:', error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Logout user and invalidate refresh token
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logoutUser = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(200).json({ message: 'Logged out successfully.' });
    }

    // Verify and remove refresh token
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      const user = await UserService.findById(decoded.id);
      if (user) {
        await user.removeRefreshToken(token);
        logger.info(`User logged out: ${user.email} (ID: ${user._id})`);
      }
    }

    res.status(200).json({ message: 'Logged out successfully.' });

  } catch (error) {
    logger.error('Error in logoutUser controller:', error);
    // Don't fail logout even if there's an error
    res.status(200).json({ message: 'Logged out successfully.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
}; 