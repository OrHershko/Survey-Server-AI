const asyncHandler = require('express-async-handler');
const Survey = require('../models/Survey');
const llmService = require('../services/llmService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger'); // Or your configured logger path

// @desc    Generate a summary for a survey
// @route   POST /api/surveys/:id/summarize
// @access  Private (Creator only)
const generateSurveySummary = asyncHandler(async (req, res, next) => {
    const surveyId = req.params.id;
    const userId = req.user.id; // Assuming auth middleware adds user to req

    const survey = await Survey.findById(surveyId);

    if (!survey) {
        return next(new AppError('Survey not found', 404));
    }

    // Authorization: Only creator can summarize
    if (survey.creator.toString() !== userId) {
        return next(new AppError('User not authorized to summarize this survey', 403));
    }

    // Compile responses - this might need more specific logic based on your Survey model
    const responsesText = survey.responses.map(r => r.responseText).join('\n---\n'); // Example
    if (!responsesText || responsesText.trim() === '') {
        return next(new AppError('No responses available to summarize', 400));
    }

    try {
        const summary = await llmService.generateSummary(
            responsesText, 
            survey.summaryInstructions || survey.guidelines,
            survey.question,
            survey.area
        );
        survey.summary = summary;
        survey.summaryLastGenerated = Date.now();
        await survey.save();
        res.status(200).json({ 
            success: true, 
            message: 'Summary generated successfully', 
            summary: survey.summary 
        });
    } catch (error) {
        logger.error(`Error generating summary for survey ${surveyId}:`, error);
        return next(new AppError('Failed to generate summary due to an internal error', 500));
    }
});

// @desc    Toggle visibility of a survey's summary
// @route   PATCH /api/surveys/:id/summary/visibility
// @access  Private (Creator only)
const toggleSummaryVisibility = asyncHandler(async (req, res, next) => {
    const surveyId = req.params.id;
    const userId = req.user.id;
    const { isVisible } = req.body; // Expecting { isVisible: true/false }

    if (typeof isVisible !== 'boolean') {
        return next(new AppError('Invalid visibility value. Must be true or false.', 400));
    }

    const survey = await Survey.findById(surveyId);

    if (!survey) {
        return next(new AppError('Survey not found', 404));
    }

    if (survey.creator.toString() !== userId) {
        return next(new AppError('User not authorized to change summary visibility for this survey', 403));
    }

    if (!survey.summary) {
        return next(new AppError('No summary available to toggle visibility. Generate a summary first.', 400));
    }

    survey.summaryVisibleToRespondents = isVisible;
    await survey.save();

    res.status(200).json({
        success: true,
        message: `Summary visibility updated to ${isVisible ? 'visible' : 'hidden'}`,
        summaryVisibleToRespondents: survey.summaryVisibleToRespondents
    });
});

// @desc    Natural language search for surveys
// @route   POST /api/surveys/search
// @access  Public (or Private, depending on requirements)
const searchSurveysNLP = asyncHandler(async (req, res, next) => {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
        return next(new AppError('Search query is required and must be a non-empty string.', 400));
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
        return next(new AppError('Failed to perform search due to an internal error', 500));
    }
});

// @desc    Validate responses for a survey against guidelines
// @route   POST /api/surveys/:id/validate-responses
// @access  Private (Creator only)
const validateSurveyResponses = asyncHandler(async (req, res, next) => {
    const surveyId = req.params.id;
    const userId = req.user.id;

    const survey = await Survey.findById(surveyId).populate('responses.user', 'username email');

    if (!survey) {
        return next(new AppError('Survey not found', 404));
    }

    if (survey.creator.toString() !== userId) {
        return next(new AppError('User not authorized to validate responses for this survey', 403));
    }

    if (!survey.responses || survey.responses.length === 0) {
        return next(new AppError('No responses available to validate', 400));
    }

    // Extract response texts for validation
    const responseTexts = survey.responses.map(r => r.responseText); // Assuming responseText field

    try {
        const validationResults = await llmService.validateResponses(responseTexts, survey.guidelines);
        // You might want to store these results or link them to responses.
        // For now, just returning them.
        res.status(200).json({ success: true, validationResults });
    } catch (error) {
        logger.error(`Error validating responses for survey ${surveyId}:`, error);
        return next(new AppError('Failed to validate responses due to an internal error', 500));
    }
});

module.exports = {
    generateSurveySummary,
    toggleSummaryVisibility,
    searchSurveysNLP,
    validateSurveyResponses,
}; 