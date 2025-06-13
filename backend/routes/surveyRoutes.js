const express = require('express');
const { createSurvey, getSurveys, getSurveyById, closeSurvey, updateSurveyExpiry, submitResponse, updateResponse, deleteResponse, getUserResponseForSurvey, getAllUserResponses } = require('../controllers/surveyController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /surveys:
 *   post:
 *     summary: Create a new survey
 *     description: Creates a new survey with questions, category, and settings
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: Customer Satisfaction Survey
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Help us improve our services
 *               questions:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Question'
 *               area:
 *                 type: string
 *                 enum: [Technology, Healthcare, Education, Business, Entertainment, Sports, Other]
 *                 example: Technology
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-12-31T23:59:59Z
 *               maxResponses:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1000
 *     responses:
 *       201:
 *         description: Survey created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 survey:
 *                   $ref: '#/components/schemas/Survey'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', protect, createSurvey);

/**
 * @swagger
 * /surveys:
 *   get:
 *     summary: Get all surveys with pagination and filtering
 *     description: Retrieves a list of surveys with optional pagination, area filtering, and keyword search
 *     tags: [Surveys]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of surveys per page
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *           enum: [Technology, Healthcare, Education, Business, Entertainment, Sports, Other]
 *         description: Filter by survey area/category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword for title or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed]
 *         description: Filter by survey status
 *     responses:
 *       200:
 *         description: Surveys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 surveys:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Survey'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalSurveys:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 */
router.get('/', getSurveys);

/**
 * @swagger
 * /surveys/responses/{user_id}:
 *   get:
 *     summary: Get all responses by a specific user across all surveys
 *     description: Retrieves all survey responses submitted by a specific user
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get responses for
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: User responses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 responses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SurveyResponse'
 *       401:
 *         description: Unauthorized or trying to access other user's responses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/responses/:user_id', protect, getAllUserResponses);

/**
 * @swagger
 * /surveys/{id}:
 *   get:
 *     summary: Get a single survey by its ID
 *     description: Retrieves detailed information about a specific survey
 *     tags: [Surveys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
 *         example: 507f1f77bcf86cd799439012
 *     responses:
 *       200:
 *         description: Survey retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 survey:
 *                   $ref: '#/components/schemas/Survey'
 *       404:
 *         description: Survey not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getSurveyById);

/**
 * @swagger
 * /surveys/{id}/close:
 *   patch:
 *     summary: Close a survey
 *     description: Closes a survey to prevent new responses (creator only)
 *     tags: [Surveys]
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
 *     responses:
 *       200:
 *         description: Survey closed successfully
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
 *                   example: Survey closed successfully
 *                 survey:
 *                   $ref: '#/components/schemas/Survey'
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
 */
router.patch('/:id/close', protect, closeSurvey);

/**
 * @swagger
 * /surveys/{id}/expiry:
 *   patch:
 *     summary: Update survey expiry date
 *     description: Updates the expiry date of a survey (creator only)
 *     tags: [Surveys]
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
 *               - expiryDate
 *             properties:
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: New expiry date (must be in the future)
 *                 example: 2024-12-31T23:59:59Z
 *     responses:
 *       200:
 *         description: Survey expiry updated successfully
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
 *                   example: Survey expiry updated successfully
 *                 survey:
 *                   $ref: '#/components/schemas/Survey'
 *       400:
 *         description: Invalid expiry date (must be in the future)
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
 */
router.patch('/:id/expiry', protect, updateSurveyExpiry);

/**
 * @swagger
 * /surveys/{id}/responses:
 *   post:
 *     summary: Submit a response to a survey
 *     description: Submits answers to a survey (one response per user per survey)
 *     tags: [Responses]
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
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Answer'
 *                 description: Array of answers corresponding to survey questions
 *     responses:
 *       201:
 *         description: Response submitted successfully
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
 *                   example: Response submitted successfully
 *                 response:
 *                   $ref: '#/components/schemas/SurveyResponse'
 *       400:
 *         description: Validation error or survey closed/expired
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
 */
router.post('/:id/responses', protect, submitResponse);

/**
 * @swagger
 * /surveys/{id}/responses/{user_id}:
 *   get:
 *     summary: Get a user's response for a specific survey
 *     description: Retrieves a specific user's response to a survey
 *     tags: [Responses]
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
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Response retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 response:
 *                   $ref: '#/components/schemas/SurveyResponse'
 *       401:
 *         description: Unauthorized - can only view own responses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Response not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/responses/:user_id', protect, getUserResponseForSurvey);

/**
 * @swagger
 * /surveys/{id}/responses/{responseId}:
 *   put:
 *     summary: Update a user's response to a survey
 *     description: Updates an existing response (owner only)
 *     tags: [Responses]
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
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Response ID
 *         example: 507f1f77bcf86cd799439013
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Answer'
 *                 description: Updated answers
 *     responses:
 *       200:
 *         description: Response updated successfully
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
 *                   example: Response updated successfully
 *                 response:
 *                   $ref: '#/components/schemas/SurveyResponse'
 *       401:
 *         description: Unauthorized - not the response owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Response not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id/responses/:responseId', protect, updateResponse);

/**
 * @swagger
 * /surveys/{id}/responses/{responseId}:
 *   delete:
 *     summary: Delete a user's response to a survey
 *     description: Deletes an existing response (owner only)
 *     tags: [Responses]
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
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Response ID
 *         example: 507f1f77bcf86cd799439013
 *     responses:
 *       200:
 *         description: Response deleted successfully
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
 *                   example: Response deleted successfully
 *       401:
 *         description: Unauthorized - not the response owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Response not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id/responses/:responseId', protect, deleteResponse);

module.exports = router; 