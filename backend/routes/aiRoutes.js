const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Assuming you have auth middleware
const { 
  generateSurveySummary,
  toggleSummaryVisibility,
  searchSurveysNLP,
  validateSurveyResponses 
} = require('../controllers/aiController');

// Middleware to check if the user is the creator of the survey (example)
// You might have this logic within each controller or a more generic role-based access control
const checkSurveyCreator = async (req, res, next) => {
  // This is a simplified check. You'd fetch the survey and compare req.user.id with survey.creator
  // For now, we'll assume the controller handles specific checks.
  // If you have a generic survey creator check middleware, you can use it here.
  // Example: await surveyController.isCreator(req, res, next);
  next(); 
};

/**
 * @swagger
 * /ai/surveys/{id}/summarize:
 *   post:
 *     summary: Generate AI-powered survey summary
 *     description: Creates an intelligent summary of survey responses using AI analysis
 *     tags: [AI Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID to summarize
 *         example: 507f1f77bcf86cd799439012
 *     responses:
 *       200:
 *         description: Summary generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Summary generated successfully
 *                 summary:
 *                   $ref: '#/components/schemas/SurveySummary'
 *       400:
 *         description: Survey has no responses or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - not the survey creator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Survey not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: AI service error or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/surveys/:id/summarize', protect, checkSurveyCreator, generateSurveySummary);

/**
 * @swagger
 * /ai/surveys/{id}/summary/visibility:
 *   patch:
 *     summary: Toggle survey summary visibility
 *     description: Changes whether a survey summary is publicly visible or private
 *     tags: [AI Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
 *         example: 507f1f77bcf86cd799439012
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isPublic
 *             properties:
 *               isPublic:
 *                 type: boolean
 *                 description: Whether the summary should be publicly visible
 *                 example: true
 *     responses:
 *       200:
 *         description: Summary visibility updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Summary visibility updated successfully
 *                 summary:
 *                   $ref: '#/components/schemas/SurveySummary'
 *       400:
 *         description: Invalid request payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - not the survey creator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Survey or summary not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/surveys/:id/summary/visibility', protect, checkSurveyCreator, toggleSummaryVisibility);

/**
 * @swagger
 * /ai/surveys/search:
 *   post:
 *     summary: Natural language survey search
 *     description: Search surveys using natural language queries powered by AI
 *     tags: [AI Features]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language search query
 *                 example: "Find surveys about customer satisfaction in technology companies"
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 10
 *                 description: Maximum number of results to return
 *               area:
 *                 type: string
 *                 enum: [Technology, Healthcare, Education, Business, Entertainment, Sports, Other]
 *                 description: Optional area filter
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       survey:
 *                         $ref: '#/components/schemas/Survey'
 *                       relevanceScore:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 1
 *                         description: AI-calculated relevance score
 *                         example: 0.85
 *                       matchReason:
 *                         type: string
 *                         description: Explanation of why this survey matches
 *                         example: "Contains questions about customer satisfaction and focuses on technology sector"
 *                 query:
 *                   type: string
 *                   description: Original search query
 *                 totalResults:
 *                   type: integer
 *                   description: Total number of matching surveys
 *       400:
 *         description: Invalid search query or parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: AI service error or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/surveys/search', searchSurveysNLP); 

/**
 * @swagger
 * /ai/surveys/{id}/validate-responses:
 *   post:
 *     summary: AI-powered response validation
 *     description: Validates survey responses for quality, consistency, and potential issues using AI
 *     tags: [AI Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID to validate responses for
 *         example: 507f1f77bcf86cd799439012
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               strictMode:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to use strict validation rules
 *               checkForSpam:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to check for spam or low-quality responses
 *               validateConsistency:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to check for internal consistency
 *     responses:
 *       200:
 *         description: Validation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Response validation completed
 *                 validation:
 *                   $ref: '#/components/schemas/ValidationResult'
 *       400:
 *         description: Survey has no responses or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - not the survey creator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Survey not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: AI service error or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/surveys/:id/validate-responses', protect, checkSurveyCreator, validateSurveyResponses);

module.exports = router; 