const express = require('express');
const { registerUser, loginUser, refreshToken, logoutUser } = require('../controllers/authController');

const router = express.Router();

// @route   POST /auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST /auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

// @route   POST /auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh', refreshToken);

// @route   POST /auth/logout
// @desc    Logout user and invalidate refresh token
// @access  Public
router.post('/logout', logoutUser);

module.exports = router; 