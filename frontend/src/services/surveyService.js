import api from './api';

export const surveyService = {
  /**
   * Create a new survey
   * @param {Object} surveyData - Survey creation data
   * @param {string} surveyData.title - Survey title
   * @param {string} surveyData.area - Survey area/domain
   * @param {string} surveyData.question - Main survey question
   * @param {string} surveyData.guidelines - Response guidelines
   * @param {string[]} surveyData.permittedDomains - Allowed response domains
   * @param {number} surveyData.permittedResponses - Max number of responses
   * @param {string} surveyData.summaryInstructions - AI summary instructions
   * @param {Date} surveyData.expiryDate - Survey expiry date
   * @returns {Promise<Object>} Created survey
   */
  async createSurvey(surveyData) {
    try {
      const response = await api.post('/surveys', surveyData);
      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to create survey. Please try again.');
    }
  },

  /**
   * Get all surveys with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 10)
   * @param {string} params.status - Filter by status (active, closed, expired)
   * @param {string} params.search - Search term for title/area
   * @returns {Promise<Object>} Paginated surveys list
   */
  async getSurveys(params = {}) {
    try {
      const response = await api.get('/surveys', { params });
      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch surveys. Please try again.');
    }
  },

  /**
   * Get a single survey by ID
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Survey details
   */
  async getSurveyById(surveyId) {
    try {
      const response = await api.get(`/surveys/${surveyId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Survey not found.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch survey details. Please try again.');
    }
  },

  /**
   * Close a survey (creator only)
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Updated survey
   */
  async closeSurvey(surveyId) {
    try {
      const response = await api.patch(`/surveys/${surveyId}/close`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to close this survey.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to close survey. Please try again.');
    }
  },

  /**
   * Update survey expiry date (creator only)
   * @param {string} surveyId - Survey ID
   * @param {Date} expiryDate - New expiry date
   * @returns {Promise<Object>} Updated survey
   */
  async updateSurveyExpiry(surveyId, expiryDate) {
    try {
      const response = await api.patch(`/surveys/${surveyId}/expiry`, {
        expiryDate
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to update this survey.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to update survey expiry. Please try again.');
    }
  },

  /**
   * Submit a response to a survey
   * @param {string} surveyId - Survey ID
   * @param {Object} responseData - Response data
   * @param {string} responseData.text - Response text
   * @returns {Promise<Object>} Created response
   */
  async submitResponse(surveyId, responseData) {
    try {
      const response = await api.post(`/surveys/${surveyId}/responses`, responseData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid response data.');
      }
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to respond to this survey.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to submit response. Please try again.');
    }
  },

  /**
   * Update a response (owner only)
   * @param {string} surveyId - Survey ID
   * @param {string} responseId - Response ID
   * @param {Object} responseData - Updated response data
   * @param {string} responseData.text - Updated response text 
   * @returns {Promise<Object>} Updated response
   */
  async updateResponse(surveyId, responseId, responseData) {
    try {
      const response = await api.put(`/surveys/${surveyId}/responses/${responseId}`, responseData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to update this response.');
      }
      if (error.response?.status === 404) {
        throw new Error('Response not found.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to update response. Please try again.');
    }
  },

  /**
   * Delete a response (owner or survey creator only)
   * @param {string} surveyId - Survey ID
   * @param {string} responseId - Response ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteResponse(surveyId, responseId) {
    try {
      const response = await api.delete(`/surveys/${surveyId}/responses/${responseId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to delete this response.');
      }
      if (error.response?.status === 404) {
        throw new Error('Response not found.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to delete response. Please try again.');
    }
  },

  /**
   * Get a user's response for a specific survey
   * @param {string} surveyId - Survey ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User response for the survey
   */
  async getUserResponseForSurvey(surveyId, userId) {
    try {
      const response = await api.get(`/surveys/${surveyId}/responses/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to access this response.');
      }
      if (error.response?.status === 404) {
        throw new Error('No response found for this user in this survey.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch user response. Please try again.');
    }
  },

  /**
   * Get all responses by a specific user across all surveys
   * @param {string} userId - User ID
   * @returns {Promise<Array>} All user responses
   */
  async getAllUserResponses(userId) {
    try {
      const response = await api.get(`/surveys/responses/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to access these responses.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to fetch user responses. Please try again.');
    }
  }
};

export default surveyService; 