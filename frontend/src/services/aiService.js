import api from './api';

export const aiService = {
  /**
   * Generate summary for a survey (creator only)
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Generated summary data
   */
  async generateSurveySummary(surveyId) {
    try {
      const response = await api.post(`/ai/surveys/${surveyId}/summarize`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to generate summary for this survey.');
      }
      if (error.response?.status === 404) {
        throw new Error('Survey not found.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to generate summary. Please try again.');
    }
  },

  /**
   * Toggle summary visibility (creator only)
   * @param {string} surveyId - Survey ID
   * @param {boolean} isVisible - Whether summary should be visible
   * @returns {Promise<Object>} Updated survey with visibility status
   */
  async toggleSummaryVisibility(surveyId, isVisible) {
    try {
      const response = await api.patch(`/ai/surveys/${surveyId}/summary/visibility`, {
        isVisible
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to modify this survey.');
      }
      if (error.response?.status === 404) {
        throw new Error('Survey not found.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to update summary visibility. Please try again.');
    }
  },

  /**
   * Search surveys using natural language
   * @param {Object} searchData - Search parameters
   * @param {string} searchData.query - Natural language search query
   * @param {number} searchData.limit - Maximum number of results (optional)
   * @returns {Promise<Object>} Search results with explanations
   */
  async searchSurveysNLP(searchData) {
    try {
      const response = await api.post('/ai/surveys/search', searchData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error('Invalid search query. Please provide a clear search term.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Search failed. Please try again.');
    }
  },

  /**
   * Validate survey responses against guidelines (creator only)
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Validation results for all responses
   */
  async validateSurveyResponses(surveyId) {
    try {
      const response = await api.post(`/ai/surveys/${surveyId}/validate-responses`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to validate responses for this survey.');
      }
      if (error.response?.status === 404) {
        throw new Error('Survey not found.');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to validate responses. Please try again.');
    }
  }
};

export default aiService; 