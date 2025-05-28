const mockLlmService = {
  generateSummary: jest.fn(),
  searchSurveys: jest.fn(),
  validateResponses: jest.fn(),
  // Add any other methods from your actual LLM service that need mocking
};

// Default mock implementations (can be overridden in specific tests)
mockLlmService.generateSummary.mockResolvedValue('This is a mock summary.');
mockLlmService.searchSurveys.mockResolvedValue([
  { id: 'survey123', reason: 'Matches search criteria based on mock logic.' },
]);
mockLlmService.validateResponses.mockResolvedValue([
  { responseId: 'response1', isValid: true },
  { responseId: 'response2', isValid: false, reason: 'Mock validation failed.' },
]);

module.exports = mockLlmService; 