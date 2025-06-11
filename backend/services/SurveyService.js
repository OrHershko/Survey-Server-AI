const BaseService = require('./BaseService');
const Survey = require('../models/SurveyModel');
const logger = require('../config/logger');

class SurveyService extends BaseService {
  constructor() {
    super(Survey); // Pass the Survey model to the BaseService constructor
  }

  /**
   * Creates a new survey.
   * @param {object} surveyData - Data for the new survey.
   * @param {string} creatorId - The ID of the user creating the survey.
   * @returns {Promise<object>} The created survey document.
   */
  async createSurvey(surveyData, creatorId) {
    const dataToSave = {
      ...surveyData,
      creator: creatorId,
    };
    logger.info(`Attempting to create survey with title: ${surveyData.title} by user: ${creatorId}`);
    return this.create(dataToSave);
  }

  // Add other survey-specific methods here later (e.g., findSurveysByUser, addResponse, etc.)

  /**
   * Finds surveys by a specific creator.
   * @param {string} creatorId - The ID of the creator.
   * @param {object} [options] - Options like limit, skip, sort.
   * @returns {Promise<Array<object>>} An array of found surveys.
   */
  async findSurveysByCreator(creatorId, options = {}) {
    return this.find({ creator: creatorId }, options);
  }

  /**
   * Adds a response to a survey.
   * @param {string} surveyId - The ID of the survey.
   * @param {object} responseData - The response data (text, user ID).
   * @returns {Promise<object|null>} The updated survey document or null if not found.
   */
  async addResponse(surveyId, responseData) {
    try {
      logger.info(`Adding response to survey ${surveyId} by user ${responseData.user}`);
      const survey = await this.findById(surveyId);
      if (!survey) {
        logger.warn(`Survey not found with id: ${surveyId} when trying to add response.`);
        return null;
      }

      // Check if user has already responded (if only one response per user is allowed for this survey)
      // This logic might be more complex based on `permittedResponses` field in SurveyModel
      const existingResponseIndex = survey.responses.findIndex(res => res.user.toString() === responseData.user.toString());

      if (existingResponseIndex !== -1) {
        // User has already responded, update existing response
        logger.info(`User ${responseData.user} updating existing response for survey ${surveyId}`);
        survey.responses[existingResponseIndex].text = responseData.text;
        survey.responses[existingResponseIndex].updatedAt = Date.now();
      } else {
        // New response
        survey.responses.push(responseData);
      }
      
      await survey.save();
      logger.info(`Response added/updated successfully for survey ${surveyId}`);
      return survey;
    } catch (error) {
      logger.error(`Error adding response to survey ${surveyId}: ${error.message}`, { stack: error.stack, surveyId, responseData });
      throw error;
    }
  }

  /**
   * Updates a specific response within a survey.
   * @param {string} surveyId - The ID of the survey.
   * @param {string} responseId - The ID of the response to update.
   * @param {string} userId - The ID of the user attempting the update.
   * @param {string} newText - The new text for the response.
   * @param {boolean} isCreator - True if the user is the creator of the survey.
   * @returns {Promise<object|null|string>} The updated response object, null if survey/response not found, or a string message if not authorized.
   */
  async updateSurveyResponse(surveyId, responseId, userId, newText, isCreator = false) {
    try {
      const survey = await this.model.findOne({ _id: surveyId, 'responses._id': responseId });
      if (!survey) {
        logger.warn(`Survey ${surveyId} or response ${responseId} not found for update.`);
        return null; // Or throw a specific error
      }

      const response = survey.responses.id(responseId);
      if (!response) {
        // Should be caught by the query above, but as a safeguard
        logger.warn(`Response ${responseId} not found within survey ${surveyId} (safeguard).`);
        return null;
      }

      const isResponseOwner = response.user.toString() === userId.toString();

      // Authorization: Only response owner can update their response
      if (!isResponseOwner) {
        logger.warn(`User ${userId} attempted to update response ${responseId} not owned by them.`);
        return 'UNAUTHORIZED';
      }
      
      // Validate survey status - non-creators cannot update responses when survey is closed
      if (survey.closed && !isCreator) {
        logger.warn(`Attempt to update response for a closed survey: ${surveyId} by non-creator.`);
        return 'SURVEY_CLOSED';
      }
      if (survey.expiryDate && new Date(survey.expiryDate) < new Date() && !isCreator) {
        logger.warn(`Attempt to update response for an expired survey: ${surveyId} by non-creator.`);
        return 'SURVEY_EXPIRED';
      }

      response.text = newText;
      response.updatedAt = new Date();
      await survey.save();
      
      logger.info(`Response ${responseId} in survey ${surveyId} updated successfully by user ${userId} (isCreator: ${isCreator}).`);
      return response; // Return the updated sub-document

    } catch (error) {
      logger.error(`Error updating response ${responseId} in survey ${surveyId}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Deletes a specific response from a survey.
   * @param {string} surveyId - The ID of the survey.
   * @param {string} responseId - The ID of the response to delete.
   * @param {string} userId - The ID of the user attempting the deletion.
   * @param {boolean} isCreator - True if the user is the creator of the survey.
   * @returns {Promise<string|null>} A success message, null if survey/response not found, or an error message string.
   */
  async deleteSurveyResponse(surveyId, responseId, userId, isCreator) {
    try {
      const survey = await this.model.findOne({ _id: surveyId, 'responses._id': responseId });
      if (!survey) {
        logger.warn(`Survey ${surveyId} or response ${responseId} not found for deletion.`);
        return null;
      }

      const response = survey.responses.id(responseId);
      if (!response) {
        logger.warn(`Response ${responseId} not found within survey ${surveyId} (safeguard).`);
        return null;
      }

      // Authorization: User can delete their own response, or creator can delete any response.
      if (!isCreator && response.user.toString() !== userId.toString()) {
        logger.warn(`User ${userId} attempted to delete response ${responseId} not owned by them, and is not creator.`);
        return 'UNAUTHORIZED';
      }
      
      // Validate survey status - e.g., cannot delete responses from a closed survey unless you are creator?
      // Current plan: "Validate survey status". Let's assume for now that responses can be deleted even if survey is closed/expired by authorized users.
      // This might need refinement based on specific business rules.
      // if (survey.closed && !isCreator) {
      //   logger.warn(`Attempt to delete response from a closed survey: ${surveyId} by non-creator.`);
      //   return 'SURVEY_CLOSED';
      // }

      // Mongoose SubdocumentArray.prototype.pull() removes all instances that match the argument.
      // Since _id is unique within the array, this is fine.
      survey.responses.pull({ _id: responseId }); 
      await survey.save();
      
      logger.info(`Response ${responseId} in survey ${surveyId} deleted successfully by user ${userId} (isCreator: ${isCreator}).`);
      return 'DELETED_SUCCESSFULLY';

    } catch (error) {
      logger.error(`Error deleting response ${responseId} in survey ${surveyId}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
}

module.exports = new SurveyService(); // Export a singleton instance 