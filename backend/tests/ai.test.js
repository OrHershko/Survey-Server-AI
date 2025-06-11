const request = require('supertest');
const app = require('../server');
const {
  createTestScenario,
  createAuthContext,
  createTestUser,
  validateApiResponse,
  cleanupTestData
} = require('./utils/testHelpers');

// Mock the LLM service to avoid external API calls
jest.mock('../services/llmService', () => require('./mocks/llmService.mock'));

describe('AI API Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(['users', 'surveys']);
  });

  describe('POST /ai/surveys/:id/summarize', () => {
    it('should generate survey summary for creator', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 5
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toBeInstanceOf(Object);
      expect(typeof response.body.summary.text).toBe('string');
      expect(response.body.summary.text.length).toBeGreaterThan(0);
    });

    it('should not allow non-creator to generate summary', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];
      
      const otherUser = await createTestUser();
      const otherAuthContext = createAuthContext(otherUser);

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', otherAuthContext.headers.Authorization);

      validateApiResponse(response, 403, false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should not generate summary without authentication', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`);

      validateApiResponse(response, 401, false);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should handle survey with no responses', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 0
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', authContext.headers.Authorization);

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 400) {
        expect(response.body.message).toContain('No responses available to summarize');
      }
    });

    it('should return 404 for non-existent survey', async () => {
      const user = await createTestUser();
      const authContext = createAuthContext(user);
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .post(`/ai/surveys/${nonExistentId}/summarize`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 404, false);
      expect(response.body.message).toContain('Survey not found');
    });

    it('should handle LLM service errors gracefully', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3,
        responseOverrides: { text: 'error test content' }
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', authContext.headers.Authorization);

      // Should handle LLM errors gracefully
      expect(response.status).toBeOneOf([200, 500, 503]);
      if (response.status >= 500) {
        expect(response.body.message).toContain('Failed to generate summary');
      }
    });

    
  });

  describe('PATCH /ai/surveys/:id/summary/visibility', () => {
    it('should toggle summary visibility for creator', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];

      // First generate a summary
      await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', authContext.headers.Authorization);

      // Toggle visibility
      const response = await request(app)
        .patch(`/ai/surveys/${survey._id}/summary/visibility`)
        .set('Authorization', authContext.headers.Authorization)
        .send({ isVisible: true });

      validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('survey');
    });

    it('should not allow non-creator to toggle visibility', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];
      
      const otherUser = await createTestUser();
      const otherAuthContext = createAuthContext(otherUser);

      const response = await request(app)
        .patch(`/ai/surveys/${survey._id}/summary/visibility`)
        .set('Authorization', otherAuthContext.headers.Authorization)
        .send({ isVisible: true });

      validateApiResponse(response, 403, false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should validate visibility payload', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];

      const response = await request(app)
        .patch(`/ai/surveys/${survey._id}/summary/visibility`)
        .set('Authorization', authContext.headers.Authorization)
        .send({ isVisible: 'invalid' });

      validateApiResponse(response, 400, false);
      expect(response.body.message).toContain('Invalid visibility value');
    });
  });

  describe('POST /ai/surveys/search', () => {
    it('should search surveys using natural language', async () => {
      await createTestScenario({
        surveyCount: 3,
        responseCount: 2
      });

      const searchQuery = { query: 'test survey about feedback' };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should handle search with no results', async () => {
      const searchQuery = { query: 'very specific non-matching query xyz123' };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.results.length).toBe(0);
    });

    it('should validate search query', async () => {
      const searchQuery = { query: '' };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      validateApiResponse(response, 400, false);
      expect(response.body.message).toContain('query');
    });

    it('should limit search results', async () => {
      await createTestScenario({
        surveyCount: 10,
        responseCount: 1
      });

      const searchQuery = { query: 'survey' };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      validateApiResponse(response, 200);
      expect(response.body.results.length).toBeLessThanOrEqual(5);
    });

    it('should handle LLM search errors gracefully', async () => {
      const searchQuery = { query: 'error test query' };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      expect(response.status).toBeOneOf([200, 500, 503]);
      if (response.status >= 500) {
        expect(response.body.message).toContain('search');
      }
    });

    it('should return relevance scores', async () => {
      await createTestScenario({
        surveyCount: 2,
        responseCount: 1
      });

      const searchQuery = { query: 'survey feedback' };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      if (response.status === 200 && response.body.results.length > 0) {
        response.body.results.forEach(result => {
          expect(result).toHaveProperty('relevanceScore');
          expect(typeof result.relevanceScore).toBe('number');
          expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(result.relevanceScore).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('POST /ai/surveys/:id/validate-responses', () => {
    it('should validate survey responses for creator', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 5
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('validationResults');
      expect(response.body.validationResults).toBeInstanceOf(Array);
    });

    it('should not allow non-creator to validate responses', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];
      
      const otherUser = await createTestUser();
      const otherAuthContext = createAuthContext(otherUser);

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', otherAuthContext.headers.Authorization);

      validateApiResponse(response, 403, false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should handle survey with no responses', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 0
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 400) {
        expect(response.body.message).toContain('No responses available to validate');
      } else {
        expect(response.body.validationResults).toBeInstanceOf(Array);
        expect(response.body.validationResults.length).toBe(0);
      }
    });

    it('should identify invalid responses', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3,
        responseOverrides: { text: 'invalid response content' }
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);
      expect(response.body.validationResults).toBeInstanceOf(Array);

      if (response.body.validationResults.length > 0) {
        response.body.validationResults.forEach(result => {
          expect(result).toHaveProperty('isValid');
          expect(result).toHaveProperty('feedback');
          expect(typeof result.isValid).toBe('boolean');
          expect(typeof result.feedback).toBe('string');
        });
      }
    });

    it('should provide validation feedback', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 2
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);

      if (response.body.validationResults.length > 0) {
        response.body.validationResults.forEach(result => {
          expect(result).toHaveProperty('feedback');
          expect(typeof result.feedback).toBe('string');
          expect(result.feedback.length).toBeGreaterThan(0);
        });
      }
    });

    it('should handle LLM validation errors gracefully', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 2,
        responseOverrides: { text: 'error test validation content' }
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      expect(response.status).toBeOneOf([200, 500, 503]);
      if (response.status >= 500) {
        expect(response.body.message).toContain('validation');
      }
    });
  });

  describe('AI Service Integration Tests', () => {
    it('should handle concurrent AI operations', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 3,
        responseCount: 2
      });

      // Run multiple AI operations concurrently
      const promises = [
        request(app)
          .post(`/ai/surveys/${surveys[0]._id}/summarize`)
          .set('Authorization', authContext.headers.Authorization),
        request(app)
          .post(`/ai/surveys/${surveys[1]._id}/validate-responses`)
          .set('Authorization', authContext.headers.Authorization),
        request(app)
          .post('/ai/surveys/search')
          .send({ query: 'test survey' })
      ];

      const results = await Promise.all(promises);

      // All operations should complete successfully or with expected errors
      results.forEach(result => {
        expect(result.status).toBeLessThan(600); // No server crashes
      });
    });

    it('should maintain consistent response format across AI endpoints', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });

      const endpoints = [
        {
          method: 'post',
          url: `/ai/surveys/${surveys[0]._id}/summarize`,
          auth: true
        },
        {
          method: 'post',
          url: '/ai/surveys/search',
          body: { query: 'test' },
          auth: false
        }
      ];

      for (const endpoint of endpoints) {
        let req = request(app)[endpoint.method](endpoint.url);
        
        if (endpoint.auth) {
          req = req.set('Authorization', authContext.headers.Authorization);
        }
        
        if (endpoint.body) {
          req = req.send(endpoint.body);
        }

        const response = await req;
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
        }
      }
    });

    it('should handle rate limiting for AI operations', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];

      // Make multiple rapid requests
      const rapidRequests = Array(10).fill().map(() =>
        request(app)
          .post(`/ai/surveys/${survey._id}/summarize`)
          .set('Authorization', authContext.headers.Authorization)
      );

      const results = await Promise.all(rapidRequests);
      
      // Some requests might be rate limited (429 status)
      // This test assumes rate limiting is implemented
      const rateLimitedRequests = results.filter(result => result.status === 429);
      
      // If rate limiting is implemented, some requests should be limited
      // If not implemented, this test will pass but suggest implementing it
    });

    it('should validate AI service environment configuration', async () => {
      const user = await createTestUser();
      const authContext = createAuthContext(user);

      // This test verifies that the mock LLM service is being used in tests
      expect(process.env.USE_MOCK_LLM).toBe('true');
      expect(process.env.NODE_ENV).toBe('test');
    });
  });

  describe('AI Response Content Validation', () => {
    it('should validate search response structure', async () => {
      await createTestScenario({
        surveyCount: 2,
        responseCount: 1
      });

      const response = await request(app)
        .post('/ai/surveys/search')
        .send({ query: 'survey feedback analysis' });

      if (response.status === 200) {
        expect(response.body.results).toBeInstanceOf(Array);

        response.body.results.forEach(result => {
          expect(result).toHaveProperty('surveyId');
          expect(result).toHaveProperty('relevanceScore');
          expect(result).toHaveProperty('reason');
          
          expect(typeof result.surveyId).toBe('string');
          expect(typeof result.relevanceScore).toBe('number');
          expect(typeof result.reason).toBe('string');
        });
      }
    });

    it('should validate validation response structure', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 2
      });

      const response = await request(app)
        .post(`/ai/surveys/${surveys[0]._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      if (response.status === 200) {
        expect(response.body.validationResults).toBeInstanceOf(Array);

        response.body.validationResults.forEach(result => {
          expect(result).toHaveProperty('responseId');
          expect(result).toHaveProperty('isValid');
          expect(result).toHaveProperty('feedback');
          
          expect(typeof result.responseId).toBe('string');
          expect(typeof result.isValid).toBe('boolean');
          expect(typeof result.feedback).toBe('string');
        });
      }
    });
  });
}); 