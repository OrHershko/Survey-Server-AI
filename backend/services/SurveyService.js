const BaseService = require('./BaseService');
const Survey = require('../models/SurveyModel');
const logger = require('../config/logger');

class SurveyService extends BaseService {
  constructor() {
    super(Survey); // Pass the Survey model to the BaseService constructor
  }

  /**
   * Creates a new survey.
   * @param {string} creatorId - The ID of the user creating the survey.
   * @param {object} surveyData - Data for the new survey.
   * @returns {Promise<object>} The created survey document.
   */
  async createSurvey(creatorId, surveyData) {
    const dataToSave = {
      ...surveyData,
      creator: creatorId,
    };
    logger.info(`Attempting to create survey with title: ${surveyData.title} by user: ${creatorId}`);
    return this.create(dataToSave);
  }

  // Add other survey-specific methods here later (e.g., findSurveysByUser, addResponse, etc.)

  /**
   * Gets a survey by ID.
   * @param {string} id - The ID of the survey.
   * @returns {Promise<object|null>} The found survey or null.
   */
  async getSurveyById(id) {
    return this.findById(id);
  }

  /**
   * Gets surveys with pagination and filtering.
   * @param {object} options - Options like page, limit, area, etc.
   * @returns {Promise<object>} Object with surveys array and pagination info.
   */
  async getSurveys(options = {}) {
    const { page = 1, limit = 10, area, ...otherFilters } = options;
    const skip = (page - 1) * limit;
    
    const query = { ...otherFilters };
    if (area) {
      query.area = area;
    }

    const surveys = await this.find(query, { limit, skip, sort: { createdAt: -1 } });
    const total = await this.count(query);
    
    return {
      surveys,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Searches surveys by keyword.
   * @param {string} keyword - The keyword to search for.
   * @returns {Promise<Array<object>>} Array of matching surveys.
   */
  async searchSurveys(keyword) {
    const query = {
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { question: { $regex: keyword, $options: 'i' } }
      ]
    };
    return this.find(query);
  }

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
   * Adds a response to a survey (overloaded method for tests).
   * @param {string} surveyId - The ID of the survey.
   * @param {string|object} userIdOrResponseData - Either user ID or response data object.
   * @param {string} [content] - The response content (if userIdOrResponseData is user ID).
   * @returns {Promise<object|null>} The updated survey document or null if not found.
   */
  async addResponse(surveyId, userIdOrResponseData, content = null) {
    let responseData;
    
    if ((typeof userIdOrResponseData === 'string' || userIdOrResponseData.toString) && content !== null && content !== undefined) {
      // Called as addResponse(surveyId, userId, content) - userId can be string or ObjectId
      responseData = {
        user: userIdOrResponseData,
        text: content
      };
    } else if (typeof userIdOrResponseData === 'object' && userIdOrResponseData.user && userIdOrResponseData.text) {
      // Called as addResponse(surveyId, responseData) - responseData is an object with user and text properties
      responseData = userIdOrResponseData;
    } else {
      throw new Error('Invalid parameters: expected (surveyId, userId, text) or (surveyId, responseData)');
    }

    // Validate responseData
    if (!responseData || !responseData.user || !responseData.text) {
      throw new Error('Response data must include user and text fields');
    }

    try {
      logger.info(`Adding response to survey ${surveyId} by user ${responseData.user}`);
      const survey = await this.findById(surveyId);
      if (!survey) {
        logger.warn(`Survey not found with id: ${surveyId} when trying to add response.`);
        return null;
      }

      // Check if survey is closed
      if (survey.closed) {
        throw new Error('Cannot add response to a closed survey');
      }

      // Check if survey is expired
      if (survey.expiryDate && new Date(survey.expiryDate) < new Date()) {
        throw new Error('Cannot add response to an expired survey');
      }

      // Check maximum response limit (if set)
      if (survey.permittedResponses && survey.responses.length >= survey.permittedResponses) {
        throw new Error(`Survey has reached maximum response limit of ${survey.permittedResponses}`);
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

  /**
   * Gets surveys by creator ID.
   * @param {string} creatorId - The creator ID.
   * @returns {Promise<Array<object>>} Array of surveys.
   */
  async getSurveysByCreator(creatorId) {
    return this.findSurveysByCreator(creatorId);
  }

  /**
   * Updates a survey.
   * @param {string} surveyId - The survey ID.
   * @param {string} userId - The user ID making the update.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated survey.
   */
  async updateSurvey(surveyId, userId, updateData) {
    const survey = await this.findById(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }
    if (survey.creator.toString() !== userId.toString()) {
      throw new Error('User not authorized to update this survey');
    }
    return this.updateById(surveyId, updateData);
  }

  /**
   * Closes a survey.
   * @param {string} surveyId - The survey ID.
   * @param {string} userId - The user ID.
   * @returns {Promise<object>} The updated survey.
   */
  async closeSurvey(surveyId, userId) {
    const survey = await this.findById(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }
    if (survey.creator.toString() !== userId.toString()) {
      throw new Error('User not authorized to close this survey');
    }
    return this.updateById(surveyId, { closed: true });
  }

  /**
   * Updates survey expiry date.
   * @param {string} surveyId - The survey ID.
   * @param {string} userId - The user ID.
   * @param {Date} expiryDate - The new expiry date.
   * @returns {Promise<object>} The updated survey.
   */
  async updateSurveyExpiry(surveyId, userId, expiryDate) {
    if (expiryDate <= new Date()) {
      throw new Error('Expiry date must be in the future');
    }
    const survey = await this.findById(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }
    if (survey.creator.toString() !== userId.toString()) {
      throw new Error('User not authorized to update this survey');
    }
    return this.updateById(surveyId, { expiryDate });
  }

  /**
   * Updates a response (alias for updateSurveyResponse).
   */
  async updateResponse(surveyId, responseId, userId, newText, isCreator = false) {
    const result = await this.updateSurveyResponse(surveyId, responseId, userId, newText, isCreator);
    if (result === 'UNAUTHORIZED') {
      throw new Error('User not authorized to update this response');
    }
    if (result === 'SURVEY_CLOSED') {
      throw new Error('Cannot update response on a closed survey');
    }
    if (result === 'SURVEY_EXPIRED') {
      throw new Error('Cannot update response on an expired survey');
    }
    if (!result) {
      throw new Error('Survey or response not found');
    }
    
    // Return the updated survey
    return this.findById(surveyId);
  }

  /**
   * Deletes a response (alias for deleteSurveyResponse).
   */
  async deleteResponse(surveyId, responseId, userId, isCreator = false) {
    const result = await this.deleteSurveyResponse(surveyId, responseId, userId, isCreator);
    if (result === 'UNAUTHORIZED') {
      throw new Error('User not authorized to delete this response');
    }
    if (!result) {
      throw new Error('Survey or response not found');
    }
    
    // Return the updated survey
    return this.findById(surveyId);
  }

  /**
   * Gets a user's response for a survey.
   * @param {string} surveyId - The survey ID.
   * @param {string} userId - The user ID.
   * @returns {Promise<object|null>} The user's response or null.
   */
  async getUserResponse(surveyId, userId) {
    const survey = await this.findById(surveyId);
    if (!survey) {
      return null;
    }
    return survey.responses.find(response => response.user.toString() === userId.toString()) || null;
  }

  /**
   * Gets all responses for a user across surveys.
   * @param {string} userId - The user ID.
   * @returns {Promise<Array<object>>} Array of responses.
   */
  async getAllUserResponses(userId) {
    const surveys = await this.find({ 'responses.user': userId });
    const userResponses = [];
    
    surveys.forEach(survey => {
      const userResponse = survey.responses.find(response => response.user.toString() === userId.toString());
      if (userResponse) {
        userResponses.push({
          ...userResponse.toObject(),
          survey: survey._id,
          surveyTitle: survey.title
        });
      }
    });
    
    return userResponses;
  }

  /**
   * Gets response count for a survey.
   * @param {string} surveyId - The survey ID.
   * @returns {Promise<number>} The response count.
   */
  async getResponseCount(surveyId) {
    const survey = await this.findById(surveyId);
    if (!survey) {
      return 0;
    }
    return survey.responses.length;
  }

  /**
   * Gets survey analytics.
   * @param {string} surveyId - The survey ID.
   * @returns {Promise<object>} Analytics object.
   */
  async getSurveyAnalytics(surveyId) {
    const survey = await this.findById(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    return {
      totalResponses: survey.responses.length,
      averageResponseLength: survey.responses.reduce((acc, resp) => acc + resp.text.length, 0) / survey.responses.length || 0,
      responseDistribution: survey.responses.map(resp => ({
        date: resp.createdAt,
        length: resp.text.length
      }))
    };
  }

  /**
   * Deletes a survey.
   * @param {string} surveyId - The survey ID.
   * @param {string} userId - The user ID.
   * @returns {Promise<boolean>} True if deleted successfully.
   */
  async deleteSurvey(surveyId, userId) {
    const survey = await this.findById(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }
    if (survey.creator.toString() !== userId.toString()) {
      throw new Error('User not authorized to delete this survey');
    }
    const deleted = await this.deleteById(surveyId);
    return !!deleted;
  }
}

module.exports = new SurveyService(); // Export a singleton instance 