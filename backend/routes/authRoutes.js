const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

// @route   POST /auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST /auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

module.exports = router; 