const logger = require('../../config/logger');

/**
 * Mock LLM Service for Testing
 * Provides static responses for different types of AI operations
 */

// Mock responses for different types of requests
const mockResponses = {
  summarize: {
    choices: [{
      message: {
        role: 'assistant',
        content: JSON.stringify({
          summary: 'This is a mock AI-generated summary of survey responses.',
          keyThemes: ['Theme 1', 'Theme 2', 'Theme 3'],
          sentiment: 'neutral',
          confidence: 0.85
        })
      }
    }],
    usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
  },
  
  search: {
    choices: [{
      message: {
        role: 'assistant',
        content: JSON.stringify([
          {
            surveyId: '507f1f77bcf86cd799439011',
            relevanceScore: 0.95,
            reason: 'This survey matches your search criteria based on content analysis.'
          }
        ])
      }
    }],
    usage: { prompt_tokens: 30, completion_tokens: 80, total_tokens: 110 }
  },
  
  validate: {
    choices: [{
      message: {
        role: 'assistant',
        content: JSON.stringify([
          {
            responseId: '507f1f77bcf86cd799439012',
            isValid: true,
            feedback: 'Response is appropriate and follows guidelines.',
            suggestions: []
          }
        ])
      }
    }],
    usage: { prompt_tokens: 40, completion_tokens: 60, total_tokens: 100 }
  },
  
  error: {
    error: 'Mock LLM Error for testing error handling'
  }
};

/**
 * Mock chat completion function
 * @param {Array} messages - Chat messages
 * @param {string} model - Model name (ignored in mock)
 * @param {object} options - Additional options (ignored in mock)
 * @returns {Promise<object>} Mock response
 */
const getChatCompletion = async (messages, model, options = {}) => {
  logger.info('Using Mock LLM Service for chat completion');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Extract the type of request from the messages
  const userMessage = messages.find(m => m.role === 'user')?.content || '';
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  
  // Determine response type based on content
  if (userMessage.toLowerCase().includes('error test') || 
      systemMessage.toLowerCase().includes('error test')) {
    throw new Error(mockResponses.error.error);
  }
  
  if (userMessage.toLowerCase().includes('summarize') || 
      systemMessage.toLowerCase().includes('summarize')) {
    return mockResponses.summarize;
  }
  
  if (userMessage.toLowerCase().includes('search') || 
      systemMessage.toLowerCase().includes('search')) {
    return mockResponses.search;
  }
  
  if (userMessage.toLowerCase().includes('validate') || 
      systemMessage.toLowerCase().includes('validate')) {
    return mockResponses.validate;
  }
  
  // Default response
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: 'This is a default mock response from the LLM service.'
      }
    }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
  };
};

/**
 * Mock functions for specific LLM operations
 */
const generateSummary = async (textToSummarize, guidelines, surveyQuestion, surveyArea) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  if (textToSummarize.includes('error test')) {
    throw new Error('Mock error during summary generation');
  }
  
  // Return a string as expected by the AI controller
  return 'Mock AI-generated summary of the survey responses. Key themes include positive feedback, areas for improvement, and suggestions.';
};

const searchSurveys = async (query, surveysContextArray) => {
  await new Promise(resolve => setTimeout(resolve, 150));
  
  if (query.includes('error test')) {
    throw new Error('Mock error during survey search');
  }
  
  return surveysContextArray.slice(0, 3).map((survey, index) => ({
    surveyId: survey._id || survey.id || `507f1f77bcf86cd799439011`,
    relevanceScore: 0.9 - (index * 0.1),
    reason: `Mock relevance match for query: ${query}`
  }));
};

const validateResponses = async (responsesArray, guidelines) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return responsesArray.map((response, index) => ({
    responseId: response.id || response._id || `mock-response-${index}`,
    isValid: !response.content?.includes('invalid'),
    feedback: response.content?.includes('invalid') 
      ? 'Response contains inappropriate content' 
      : 'Response is appropriate and follows guidelines',
    suggestions: response.content?.includes('invalid') 
      ? ['Please provide more constructive feedback', 'Consider rephrasing your response']
      : []
  }));
};

// Override environment check for mock
const useMockLLM = true;

module.exports = {
  getChatCompletion,
  generateSummary,
  searchSurveys,
  validateResponses,
  useMockLLM,
  mockResponses,
  // Expose loadPrompts as a mock (no-op)
  loadPrompts: async () => {
    logger.info('Mock LLM: Skipping prompt loading in test environment');
  },
  getPrompt: (promptName, variables = {}) => {
    return `Mock prompt for ${promptName} with variables: ${JSON.stringify(variables)}`;
  }
}; 