const SurveyService = require('../services/SurveyService');
const { surveyCreationSchema, surveyUpdateExpirySchema, surveyResponseSchema } = require('../validators/surveyValidation');
const logger = require('../config/logger');

/**
 * @desc    Create a new survey
 * @route   POST /surveys
 * @access  Private (Requires authentication)
 */
const createSurvey = async (req, res, next) => {
  try {
    // 1. Validate request body using Joi schema
    const { error, value } = surveyCreationSchema.validate(req.body);
    if (error) {
      logger.warn('Survey creation validation failed:', error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }

    // 2. Get creator ID from the authenticated user (attached by 'protect' middleware)
    const creatorId = req.user._id; // or req.user.id, depending on your auth middleware
    if (!creatorId) {
      logger.error('Creator ID not found in request. Ensure auth middleware is working.');
      return res.status(401).json({ message: 'Not authorized, user ID not found.'});
    }

    // 3. Call SurveyService to create the survey
    const survey = await SurveyService.createSurvey(creatorId, value);

    logger.info(`Survey created successfully: ${survey.title} (ID: ${survey._id}) by user ${creatorId}`);

    // 4. Return the created survey
    res.status(201).json(survey);

  } catch (error) {
    logger.error('Error in createSurvey controller:', error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Get all active surveys with pagination and filtering
 * @route   GET /surveys
 * @access  Public
 */
const getSurveys = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, creator, status, search } = req.query;

    // Build query based on parameters
    const query = {};

    // Filter by creator if provided (for "My Surveys" page)
    if (creator) {
      query.creator = creator;
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      if (status === 'active') {
        query.closed = false;
        query.expiryDate = { $gt: new Date() };
      } else if (status === 'closed') {
        query.closed = true;
      } else if (status === 'expired') {
        query.closed = false;
        query.expiryDate = { $lte: new Date() };
      }
    }

    // Search by title or area if provided
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { area: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const options = {
      skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 }, // Default sort by newest
    };

    // Select only basic information for listing
    const selectFields = 'title area question creator expiryDate closed createdAt responses summary'; // Added responses for count and summary for dashboard stats

    const surveys = await SurveyService.find(query, options, selectFields, { path: 'creator', select: 'username' });
    const totalSurveys = await SurveyService.count(query);

    // Add responseCount to each survey
    const surveysWithResponseCount = surveys.map(survey => ({
      ...survey.toObject(), // Convert Mongoose document to plain object
      responseCount: survey.responses ? survey.responses.length : 0,
      // responses: undefined // Optionally remove the full responses array if only count is needed for list view
    }));

    logger.info(`Retrieved ${surveysWithResponseCount.length} surveys for page ${page} with limit ${limit}`);

    res.status(200).json({
      surveys: surveysWithResponseCount,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(totalSurveys / parseInt(limit, 10)),
      totalSurveys,
    });

  } catch (error) {
    logger.error('Error in getSurveys controller:', error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Get a single survey by its ID
 * @route   GET /surveys/:id
 * @access  Public (with conditional data based on user role/summary visibility)
 */
const getSurveyById = async (req, res, next) => {
  try {
    const surveyId = req.params.id;
    let userId = null;

    // Check if user is authenticated to determine if they are the creator or a contributor
    // This is a soft check; the route is public, but data visibility changes if logged in.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      logger.info(`Attempting JWT verification for survey ${surveyId}, token present: ${!!token}`);
      const decoded = require('../utils/jwtUtils').verifyToken(token);
      if (decoded && decoded.id) {
        userId = decoded.id;
        logger.info(`JWT verification successful, userId: ${userId}`);
      } else {
        logger.warn(`JWT verification failed or no user ID in token for survey ${surveyId}`);
      }
    } else {
      logger.info(`No authorization header found for survey ${surveyId}`);
    }

    // Populate creator details and response user details
    const populateOptions = [
      { path: 'creator', select: 'username email' },
      { path: 'responses.user', select: 'username' } // Select username for users who responded
    ];
    
    const survey = await SurveyService.findById(surveyId, '', populateOptions);

    if (!survey) {
      logger.warn(`Survey not found with id: ${surveyId}`);
      return res.status(404).json({ message: 'Survey not found.' });
    }

    const surveyData = survey.toObject(); // Convert to plain object to modify

    const isCreator = userId && survey.creator._id.toString() === userId.toString();
    logger.info(`Creator detection for survey ${surveyId}: userId=${userId}, creatorId=${survey.creator._id.toString()}, isCreator=${isCreator}`);
    
    // Add responseCount BEFORE potentially deleting responses
    surveyData.responseCount = survey.responses ? survey.responses.length : 0;
    logger.info(`Survey ${surveyId} responseCount: ${surveyData.responseCount}`);
    
    // TODO: Implement logic for 'contributor' if that's a defined role or concept
    // For now, only creator can see all responses directly.
    // Others will see responses based on a different logic (e.g. if they have responded themselves, or if responses are public)
    // This part might need more clarification based on product requirements for "contributor"

    // By default, do not include responses array unless user is creator or survey responses are public (not implemented yet)
    if (!isCreator) {
      // Check if the current user has responded to this survey
      const userHasResponded = userId ? survey.responses.some(r => r.user.toString() === userId) : false;
      surveyData.userHasResponded = userHasResponded;
        
      // If not creator, don't send the full responses array by default.
      // Individual responses might be viewable under different conditions later (e.g. if user submitted one)
      delete surveyData.responses; 
    }

    // Respect summary visibility settings
    if (!isCreator && surveyData.summary && !surveyData.summary.isVisible) {
      // Only hide summary from non-creators if it's not visible
      // Creator can always see their own summary, even if not visible to public
      logger.info(`Hiding summary from non-creator for survey ${surveyId}: isVisible=${surveyData.summary.isVisible}`);
      delete surveyData.summary;
    } else if (surveyData.summary) {
      logger.info(`Summary visible for survey ${surveyId}: isCreator=${isCreator}, isVisible=${surveyData.summary.isVisible}`);
    } else {
      logger.info(`No summary exists for survey ${surveyId}`);
    }

    logger.info(`Retrieved survey by ID: ${surveyId}`);
    res.status(200).json(surveyData);

  } catch (error) {
    logger.error(`Error in getSurveyById controller (ID: ${req.params.id}):`, error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Close a survey
 * @route   PATCH /surveys/:id/close
 * @access  Private (Creator only)
 */
const closeSurvey = async (req, res, next) => {
  try {
    const surveyId = req.params.id;
    const userId = req.user._id; // From protect middleware

    const survey = await SurveyService.findById(surveyId);

    if (!survey) {
      logger.warn(`Survey not found with id: ${surveyId} for closing.`);
      return res.status(404).json({ message: 'Survey not found.' });
    }

    // Check if the authenticated user is the creator of the survey
    if (survey.creator.toString() !== userId.toString()) {
      logger.warn(`User ${userId} attempted to close survey ${surveyId} not owned by them.`);
      return res.status(403).json({ message: 'Not authorized to close this survey.' });
    }

    if (survey.closed) {
      logger.info(`Survey ${surveyId} is already closed.`);
      // You might want to return the survey as is, or a specific message
      return res.status(200).json({ message: 'Survey is already closed.', survey }); 
    }

    // Update survey status in the database
    const updatedSurvey = await SurveyService.updateById(surveyId, { closed: true }, { new: true });
    // The updateById in BaseService should have { new: true } by default to return the updated doc

    if (!updatedSurvey) {
      // This case should ideally not happen if findById succeeded, but as a safeguard:
      logger.error(`Failed to update survey ${surveyId} to closed, though it was found.`);
      return res.status(500).json({ message: 'Failed to close survey after finding it.'});
    }

    logger.info(`Survey ${surveyId} closed successfully by user ${userId}.`);
    res.status(200).json({ message: 'Survey closed successfully.', survey: updatedSurvey });

  } catch (error) {
    logger.error(`Error in closeSurvey controller (ID: ${req.params.id}):`, error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Update survey expiry date
 * @route   PATCH /surveys/:id/expiry
 * @access  Private (Creator only)
 */
const updateSurveyExpiry = async (req, res, next) => {
  try {
    const surveyId = req.params.id;
    const userId = req.user._id; // From protect middleware

    // 1. Validate request body
    const { error, value } = surveyUpdateExpirySchema.validate(req.body);
    if (error) {
      logger.warn('Survey expiry update validation failed:', error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }
    const { expiryDate } = value;

    // 2. Find the survey
    const survey = await SurveyService.findById(surveyId);
    if (!survey) {
      logger.warn(`Survey not found with id: ${surveyId} for expiry update.`);
      return res.status(404).json({ message: 'Survey not found.' });
    }

    // 3. Check if the authenticated user is the creator
    if (survey.creator.toString() !== userId.toString()) {
      logger.warn(`User ${userId} attempted to update expiry for survey ${surveyId} not owned by them.`);
      return res.status(403).json({ message: 'Not authorized to update this survey\'s expiry.' });
    }

    // 4. Check if survey is already closed or has passed its original expiry (if any)
    //    Depending on requirements, you might allow extending an already expired survey or not.
    //    For now, let's assume you can update expiry as long as it's not manually closed.
    if (survey.closed) {
      logger.info(`Attempt to update expiry for an already closed survey: ${surveyId}`);
      return res.status(400).json({ message: 'Cannot update expiry for a closed survey.'});
    }

    // 5. Update survey expiry date
    const updatedSurvey = await SurveyService.updateById(surveyId, { expiryDate }, { new: true });

    if (!updatedSurvey) {
      logger.error(`Failed to update expiry for survey ${surveyId}, though it was found.`);
      return res.status(500).json({ message: 'Failed to update survey expiry after finding it.'});
    }

    logger.info(`Survey ${surveyId} expiry updated successfully to ${expiryDate} by user ${userId}.`);
    res.status(200).json({ message: 'Survey expiry updated successfully.', survey: updatedSurvey });

  } catch (error) {
    logger.error(`Error in updateSurveyExpiry controller (ID: ${req.params.id}):`, error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Submit a response to a survey
 * @route   POST /surveys/:id/responses
 * @access  Private (Requires authentication)
 */
const submitResponse = async (req, res, next) => {
  try {
    const surveyId = req.params.id;
    const userId = req.user._id; // From protect middleware

    // 1. Validate request body
    const { error, value } = surveyResponseSchema.validate(req.body);
    if (error) {
      logger.warn('Survey response validation failed:', error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }
    const { text } = value;

    // 2. Find the survey
    const survey = await SurveyService.findById(surveyId);
    if (!survey) {
      logger.warn(`Survey not found with id: ${surveyId} for submitting response.`);
      return res.status(404).json({ message: 'Survey not found.' });
    }

    // 3. Validate survey is open and not expired
    if (survey.closed) {
      logger.warn(`Attempt to submit response to a closed survey: ${surveyId}`);
      return res.status(400).json({ message: 'Survey is closed and no longer accepting responses.' });
    }
    if (survey.expiryDate && new Date(survey.expiryDate) < new Date()) {
      logger.warn(`Attempt to submit response to an expired survey: ${surveyId}`);
      return res.status(400).json({ message: 'Survey has expired and no longer accepting responses.' });
    }

    // 4. Call SurveyService to add/update the response
    // The service method handles checking for duplicates and updating if necessary.
    const responseData = { text, user: userId };
    const updatedSurvey = await SurveyService.addResponse(surveyId, responseData);

    if (!updatedSurvey) {
      // This might happen if the survey was deleted between the findById and addResponse calls (unlikely but possible)
      logger.error(`Failed to submit response to survey ${surveyId}, survey might have been deleted.`);
      return res.status(404).json({ message: 'Could not submit response. Survey may no longer exist.' });
    }

    // Find the submitted/updated response to return it specifically
    // The service method `addResponse` already updates `updatedAt` for the specific response
    const submittedOrUpdatedResponse = updatedSurvey.responses.find(
      res => res.user.toString() === userId.toString()
    );

    logger.info(`Response submitted/updated successfully for survey ${surveyId} by user ${userId}.`);
    // 5. Return the updated survey or just the response/success message
    res.status(201).json({
      message: 'Response submitted successfully.',
      response: submittedOrUpdatedResponse,
      // survey: updatedSurvey // Optionally return the whole updated survey
    });

  } catch (error) {
    logger.error(`Error in submitResponse controller (Survey ID: ${req.params.id}):`, error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Update a user's response to a survey
 * @route   PUT /surveys/:id/responses/:responseId
 * @access  Private (Owner of the response only)
 */
const updateResponse = async (req, res, next) => {
  try {
    const { id: surveyId, responseId } = req.params;
    const userId = req.user._id; // From protect middleware

    // 1. Validate request body
    const { error, value } = surveyResponseSchema.validate(req.body); // Re-use surveyResponseSchema for text validation
    if (error) {
      logger.warn('Survey response update validation failed:', error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }
    const { text: newText } = value;

    // 2. Check if the current user is the survey creator
    const survey = await SurveyService.findById(surveyId);
    if (!survey) {
      logger.warn(`Survey ${surveyId} not found for response update.`);
      return res.status(404).json({ message: 'Survey not found.' });
    }

    const isCreator = survey.creator.toString() === userId.toString();

    // 3. Call SurveyService to update the response
    const result = await SurveyService.updateSurveyResponse(surveyId, responseId, userId, newText, isCreator);

    if (!result) {
      logger.warn(`Survey ${surveyId} or response ${responseId} not found for update by user ${userId}.`);
      return res.status(404).json({ message: 'Survey or response not found.' });
    }

    if (result === 'UNAUTHORIZED') {
      logger.warn(`User ${userId} unauthorized to update response ${responseId} in survey ${surveyId}.`);
      return res.status(403).json({ message: 'Not authorized to update this response.' });
    }
    if (result === 'SURVEY_CLOSED') {
      return res.status(400).json({ message: 'Survey is closed and responses cannot be updated.' });
    }
    if (result === 'SURVEY_EXPIRED') {
      return res.status(400).json({ message: 'Survey has expired and responses cannot be updated.' });
    }
    
    // `result` is the updated response sub-document if successful
    logger.info(`Response ${responseId} in survey ${surveyId} updated by user ${userId}.`);
    res.status(200).json({ 
      message: 'Response updated successfully.', 
      response: result 
    });

  } catch (error) {
    logger.error(`Error in updateResponse controller (Survey ID: ${req.params.id}, Response ID: ${req.params.responseId}):`, error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Delete a response from a survey
 * @route   DELETE /surveys/:id/responses/:responseId
 * @access  Private (Owner of the response or Survey Creator)
 */
const deleteResponse = async (req, res, next) => {
  try {
    const { id: surveyId, responseId } = req.params;
    const userId = req.user._id; // From protect middleware

    // First, fetch the survey to check if the current user is the creator
    const survey = await SurveyService.findById(surveyId);
    if (!survey) {
      logger.warn(`Survey ${surveyId} not found for response deletion.`);
      return res.status(404).json({ message: 'Survey not found.' });
    }

    const isCreator = survey.creator.toString() === userId.toString();

    // Call SurveyService to delete the response
    const result = await SurveyService.deleteSurveyResponse(surveyId, responseId, userId, isCreator);

    if (!result) {
      logger.warn(`Survey ${surveyId} or response ${responseId} not found for deletion by user ${userId}.`);
      return res.status(404).json({ message: 'Survey or response not found.' });
    }

    if (result === 'UNAUTHORIZED') {
      logger.warn(`User ${userId} unauthorized to delete response ${responseId} in survey ${surveyId}.`);
      return res.status(403).json({ message: 'Not authorized to delete this response.' });
    }
    
    // Handle other specific string error messages from service if any (e.g., 'SURVEY_CLOSED')

    if (result === 'DELETED_SUCCESSFULLY') {
      logger.info(`Response ${responseId} in survey ${surveyId} deleted by user ${userId}.`);
      return res.status(200).json({ message: 'Response deleted successfully.' });
    }
    
    // Fallback for unexpected service results
    logger.error(`Unexpected result from deleteSurveyResponse service: ${result}`);
    return res.status(500).json({ message: 'Could not delete response due to an unexpected issue.' });

  } catch (error) {
    logger.error(`Error in deleteResponse controller (Survey ID: ${req.params.id}, Response ID: ${req.params.responseId}):`, error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Get a user's response for a specific survey
 * @route   GET /surveys/:id/responses/:user_id
 * @access  Private (User can only get their own response)
 */
const getUserResponseForSurvey = async (req, res, next) => {
  try {
    const { id: surveyId, user_id: userId } = req.params;
    const requestingUserId = req.user._id; // From protect middleware

    // Users can only access their own responses
    // Convert both to strings for comparison
    if (userId.toString() !== requestingUserId.toString()) {
      logger.warn(`User ${requestingUserId} attempted to access response for user ${userId} in survey ${surveyId}.`);
      return res.status(403).json({ message: 'Not authorized to access this response.' });
    }

    // Find the survey with the specific response
    const survey = await SurveyService.findById(surveyId, '', [
      { path: 'creator', select: 'username' },
      { path: 'responses.user', select: 'username' }
    ]);

    if (!survey) {
      logger.warn(`Survey not found with id: ${surveyId}`);
      return res.status(404).json({ message: 'Survey not found.' });
    }

    // Find the user's response in this survey
    const userResponse = survey.responses.find(response => 
      response.user._id.toString() === userId
    );

    if (!userResponse) {
      logger.warn(`No response found for user ${userId} in survey ${surveyId}.`);
      return res.status(404).json({ message: 'No response found for this user in this survey.' });
    }

    // Format the response with survey context
    const responseWithContext = {
      _id: userResponse._id,
      text: userResponse.text,
      createdAt: userResponse.createdAt,
      updatedAt: userResponse.updatedAt,
      survey: {
        _id: survey._id,
        title: survey.title,
        area: survey.area,
        question: survey.question
      }
    };

    logger.info(`Retrieved response for user ${userId} in survey ${surveyId}.`);
    res.status(200).json(responseWithContext);

  } catch (error) {
    logger.error(`Error in getUserResponseForSurvey controller (Survey ID: ${req.params.id}, User ID: ${req.params.user_id}):`, error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

/**
 * @desc    Get all responses by a specific user across all surveys
 * @route   GET /surveys/responses/:user_id
 * @access  Private (User can only get their own responses)
 */
const getAllUserResponses = async (req, res, next) => {
  try {
    const { user_id: userId } = req.params;
    const requestingUserId = req.user._id; // From protect middleware

    // Users can only access their own responses
    // Convert both to strings for comparison
    if (userId.toString() !== requestingUserId.toString()) {
      logger.warn(`User ${requestingUserId} attempted to access responses for user ${userId}.`);
      return res.status(403).json({ message: 'Not authorized to access these responses.' });
    }

    // Find all surveys that contain responses from this user
    const surveys = await SurveyService.find(
      { 'responses.user': userId },
      {},
      '',
      [
        { path: 'creator', select: 'username' },
        { path: 'responses.user', select: 'username' }
      ]
    );

    // Extract and format user responses with survey context
    const userResponses = [];
    surveys.forEach(survey => {
      survey.responses.forEach(response => {
        if (response.user._id.toString() === userId) {
          userResponses.push({
            _id: response._id,
            text: response.text,
            createdAt: response.createdAt,
            updatedAt: response.updatedAt,
            survey: {
              _id: survey._id,
              title: survey.title,
              area: survey.area,
              question: survey.question,
              closed: survey.closed,
              expiryDate: survey.expiryDate,
              creator: survey.creator._id
            }
          });
        }
      });
    });

    // Sort by creation date (newest first)
    userResponses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    logger.info(`Retrieved ${userResponses.length} responses for user ${userId}.`);
    res.status(200).json(userResponses);

  } catch (error) {
    logger.error(`Error in getAllUserResponses controller (User ID: ${req.params.user_id}):`, error);
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

module.exports = {
  createSurvey,
  getSurveys,
  getSurveyById,
  closeSurvey,
  updateSurveyExpiry,
  submitResponse,
  updateResponse,
  deleteResponse,
  getUserResponseForSurvey,
  getAllUserResponses,
  // Other survey controller functions will be added here
}; 