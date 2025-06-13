const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Assuming you have auth middleware
const { 
    generateSurveySummary,
    toggleSummaryVisibility,
    searchSurveysNLP,
    validateSurveyResponses 
} = require('../controllers/aiController');
const surveyController = require('../controllers/surveyController'); // For creator check middleware or similar

// Middleware to check if the user is the creator of the survey (example)
// You might have this logic within each controller or a more generic role-based access control
const checkSurveyCreator = async (req, res, next) => {
    // This is a simplified check. You'd fetch the survey and compare req.user.id with survey.creator
    // For now, we'll assume the controller handles specific checks.
    // If you have a generic survey creator check middleware, you can use it here.
    // Example: await surveyController.isCreator(req, res, next);
    next(); 
};

// AI Powered Features API

// POST /api/ai/surveys/:id/summarize - Generate Summary
// Note: I am prefixing with /ai to group AI related routes. 
// Alternatively, these could be part of /surveys routes.
router.post('/surveys/:id/summarize', protect, checkSurveyCreator, generateSurveySummary);

// PATCH /api/ai/surveys/:id/summary/visibility - Toggle Summary Visibility
router.patch('/surveys/:id/summary/visibility', protect, checkSurveyCreator, toggleSummaryVisibility);

// POST /api/ai/surveys/search - Natural Language Search
// 'protect' can be added if search is not public
router.post('/surveys/search', searchSurveysNLP); 

// POST /api/ai/surveys/:id/validate-responses - Validate Responses
router.post('/surveys/:id/validate-responses', protect, checkSurveyCreator, validateSurveyResponses);

module.exports = router; 