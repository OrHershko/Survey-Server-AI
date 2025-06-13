const asyncHandler = require('express-async-handler');
const Survey = require('../models/SurveyModel');
const llmService = require('../services/llmService');
const logger = require('../config/logger'); // Or your configured logger path

// @desc    Generate a summary for a survey
// @route   POST /surveys/:id/summarize
// @access  Private (Creator only)
const generateSurveySummary = asyncHandler(async (req, res) => {
  const surveyId = req.params.id;
  const userId = req.user._id; // User object has _id field

  const survey = await Survey.findById(surveyId);

  if (!survey) {
    //return next(new AppError('Survey not found', 404));
    return res.status(404).json({ message: 'Survey not found' });
  }

  // Authorization: Only creator can summarize
  if (survey.creator.toString() !== userId.toString()) {
    //return next(new AppError('User not authorized to summarize this survey', 403));
    return res.status(403).json({ message: 'User not authorized to summarize this survey' });
  }

  // Compile responses - this might need more specific logic based on your Survey model
  const responsesText = survey.responses.map(r => r.text).join('\n---\n');
  if (!responsesText || responsesText.trim() === '') {
    //return next(new AppError('No responses available to summarize', 400));
    return res.status(400).json({ message: 'No responses available to summarize' });
  }

  try {
    const summaryResult = await llmService.generateSummary(
      responsesText, 
      survey.summaryInstructions || survey.guidelines,
      survey.question,
      survey.area
    );
    
    // Handle both string and object responses from LLM service
    const summaryText = typeof summaryResult === 'string' 
      ? summaryResult 
      : summaryResult.summary || JSON.stringify(summaryResult);
      
    survey.summary = {
      text: summaryText,
      generatedAt: new Date(),
      isVisible: false
    };
    await survey.save();
    res.status(200).json({ 
      success: true, 
      message: 'Summary generated successfully', 
      summary: survey.summary 
    });
  } catch (error) {
    logger.error(`Error generating summary for survey ${surveyId}:`, error);
    //return next(new AppError('Failed to generate summary due to an internal error', 500));
    return res.status(500).json({ message: 'Failed to generate summary due to an internal error' });
  }
});

// @desc    Toggle visibility of a survey's summary
// @route   PATCH /surveys/:id/summary/visibility
// @access  Private (Creator only)
const toggleSummaryVisibility = asyncHandler(async (req, res) => {
  const surveyId = req.params.id;
  const userId = req.user._id;
  const { isVisible } = req.body; // Expecting { isVisible: true/false }

  if (typeof isVisible !== 'boolean') {
    //return next(new AppError('Invalid visibility value. Must be true or false.', 400));
    return res.status(400).json({ message: 'Invalid visibility value. Must be true or false.' });
  }

  const survey = await Survey.findById(surveyId);

  if (!survey) {
    //return next(new AppError('Survey not found', 404));
    return res.status(404).json({ message: 'Survey not found' });
  }

  if (survey.creator.toString() !== userId.toString()) {
    //return next(new AppError('User not authorized to change summary visibility for this survey', 403));
    return res.status(403).json({ message: 'User not authorized to change summary visibility for this survey' });
  }

  if (!survey.summary) {
    //return next(new AppError('No summary available to toggle visibility. Generate a summary first.', 400));
    return res.status(400).json({ message: 'No summary available to toggle visibility. Generate a summary first.' });
  }

  survey.summary.isVisible = isVisible;
  await survey.save();

  res.status(200).json({
    success: true,
    message: `Summary visibility updated to ${isVisible ? 'visible' : 'hidden'}`,
    survey: survey
  });
});

// @desc    Natural language search for surveys
// @route   POST /surveys/search
// @access  Public (or Private, depending on requirements)
const searchSurveysNLP = asyncHandler(async (req, res, next) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    //return next(new AppError('Search query is required and must be a non-empty string.', 400));
    return res.status(400).json({ message: 'Search query is required and must be a non-empty string.' });
  }

  // Fetch surveys to provide context. This might need to be optimized for many surveys.
  // For simplicity, fetching all surveys. Consider pagination or filtering.
  // Also, decide what parts of the survey are relevant for the LLM context.
  const surveysContext = await Survey.find({}, 'title area question guidelines').lean(); 

  try {
    const matchedSurveys = await llmService.searchSurveys(query, surveysContext);
    res.status(200).json({ success: true, results: matchedSurveys });
  } catch (error) {
    logger.error(`Error during natural language search for surveys with query "${query}":`, error);
    //return next(new AppError('Failed to perform search due to an internal error', 500));
    return res.status(500).json({ message: 'Failed to perform search due to an internal error' });
  }
});

// @desc    Validate responses for a survey against guidelines
// @route   POST /surveys/:id/validate-responses
// @access  Private (Creator only)
const validateSurveyResponses = asyncHandler(async (req, res, next) => {
  const surveyId = req.params.id;
  const userId = req.user._id;

  const survey = await Survey.findById(surveyId).populate('responses.user', 'username email');

  if (!survey) {
    //return next(new AppError('Survey not found', 404));
    return res.status(404).json({ message: 'Survey not found' });
  }

  if (survey.creator.toString() !== userId.toString()) {
    //return next(new AppError('User not authorized to validate responses for this survey', 403));
    return res.status(403).json({ message: 'User not authorized to validate responses for this survey' });
  }

  if (!survey.responses || survey.responses.length === 0) {
    //return next(new AppError('No responses available to validate', 400));
    return res.status(400).json({ message: 'No responses available to validate' });
  }

  // Extract response texts for validation
  const responseTexts = survey.responses.map(r => r.text);

  try {
    const validationResults = await llmService.validateResponses(responseTexts, survey.guidelines);
    // You might want to store these results or link them to responses.
    // For now, just returning them.
    res.status(200).json({ success: true, validationResults });
  } catch (error) {
    logger.error(`Error validating responses for survey ${surveyId}:`, error);
    //return next(new AppError('Failed to validate responses due to an internal error', 500));
    return res.status(500).json({ message: 'Failed to validate responses due to an internal error' });
  }
});

module.exports = {
  generateSurveySummary,
  toggleSummaryVisibility,
  searchSurveysNLP,
  validateSurveyResponses,
}; 