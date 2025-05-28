const express = require('express');
const { createSurvey, getSurveys, getSurveyById, closeSurvey, updateSurveyExpiry, submitResponse, updateResponse, deleteResponse } = require('../controllers/surveyController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /surveys
// @desc    Create a new survey
// @access  Private (Requires authentication)
router.post('/', protect, createSurvey);

// @route   GET /surveys
// @desc    Get all surveys with pagination and filtering
// @access  Public
router.get('/', getSurveys);

// @route   GET /surveys/:id
// @desc    Get a single survey by its ID
// @access  Public
router.get('/:id', getSurveyById);

// @route   PATCH /surveys/:id/close
// @desc    Close a survey
// @access  Private (Creator only)
router.patch('/:id/close', protect, closeSurvey);

// @route   PATCH /surveys/:id/expiry
// @desc    Update survey expiry date
// @access  Private (Creator only)
router.patch('/:id/expiry', protect, updateSurveyExpiry);

// Survey response routes
// @route   POST /surveys/:id/responses
// @desc    Submit a response to a survey
// @access  Private (Requires authentication)
router.post('/:id/responses', protect, submitResponse);

// @route   PUT /surveys/:id/responses/:responseId
// @desc    Update a user's response to a survey
// @access  Private (Owner of the response only)
router.put('/:id/responses/:responseId', protect, updateResponse);

// @route   DELETE /surveys/:id/responses/:responseId
// @desc    Delete a user's response to a survey
// @access  Private (Owner of the response only)
router.delete('/:id/responses/:responseId', protect, deleteResponse);

// Other survey routes will be added here

module.exports = router; 