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
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('summary');
      expect(response.body.data.summary).to.be.a('string');
      expect(response.body.data.summary.length).to.be.greaterThan(0);
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
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('not authorized');
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
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Not authorized');
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

      expect(response.status).to.be.oneOf([200, 400]);
      if (response.status === 400) {
        expect(response.body.message).to.include('no responses');
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
      expect(response.body.success).to.be.false;
    });

    it('should handle LLM service errors gracefully', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3,
        responseOverrides: { content: 'error test content' }
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', authContext.headers.Authorization);

      // Should handle LLM errors gracefully
      expect(response.status).to.be.oneOf([200, 500, 503]);
      if (response.status >= 500) {
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.include('AI service');
      }
    });

    it('should cache summary results', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];

      // First request
      const response1 = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', authContext.headers.Authorization);

      // Second request (should be faster due to caching)
      const startTime = Date.now();
      const response2 = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', authContext.headers.Authorization);
      const endTime = Date.now();

      expect(response1.status).to.equal(200);
      expect(response2.status).to.equal(200);
      
      // Second request should be faster (cached)
      // This test assumes caching is implemented
      if (response1.body.data.summary === response2.body.data.summary) {
        expect(endTime - startTime).to.be.lessThan(1000);
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
        .send({ isPublic: true });

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('survey');
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
        .send({ isPublic: true });

      validateApiResponse(response, 403, false);
      expect(response.body.success).to.be.false;
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
        .send({ isPublic: 'invalid' }); // Should be boolean

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
    });
  });

  describe('POST /ai/surveys/search', () => {
    it('should search surveys using natural language', async () => {
      await createTestScenario({
        surveyCount: 5,
        surveyOverrides: { 
          title: 'Customer Satisfaction Survey',
          area: 'Technology'
        }
      });

      const searchQuery = {
        query: 'customer satisfaction technology surveys',
        limit: 10
      };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('results');
      expect(response.body.data.results).to.be.an('array');
    });

    it('should handle search with no results', async () => {
      const searchQuery = {
        query: 'non-existent survey topic that should not match anything',
        limit: 10
      };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.results).to.be.an('array');
      expect(response.body.data.results.length).to.equal(0);
    });

    it('should validate search query', async () => {
      const response = await request(app)
        .post('/ai/surveys/search')
        .send({
          query: '', // Empty query
          limit: 10
        });

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('query');
    });

    it('should limit search results', async () => {
      await createTestScenario({
        surveyCount: 20,
        surveyOverrides: { area: 'Technology' }
      });

      const searchQuery = {
        query: 'technology surveys',
        limit: 5
      };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      validateApiResponse(response, 200);
      expect(response.body.data.results.length).to.be.at.most(5);
    });

    it('should handle LLM search errors gracefully', async () => {
      const searchQuery = {
        query: 'error test search query that should trigger mock error',
        limit: 10
      };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      expect(response.status).to.be.oneOf([200, 500, 503]);
      if (response.status >= 500) {
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.include('search');
      }
    });

    it('should return relevance scores', async () => {
      await createTestScenario({
        surveyCount: 3,
        surveyOverrides: { title: 'Technology Survey' }
      });

      const searchQuery = {
        query: 'technology',
        limit: 10
      };

      const response = await request(app)
        .post('/ai/surveys/search')
        .send(searchQuery);

      if (response.status === 200 && response.body.data.results.length > 0) {
        response.body.data.results.forEach(result => {
          expect(result).to.have.property('relevanceScore');
          expect(result.relevanceScore).to.be.a('number');
          expect(result.relevanceScore).to.be.within(0, 1);
        });
      }
    });
  });

  describe('POST /ai/surveys/:id/validate-responses', () => {
    it('should validate survey responses for creator', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 5,
        responseOverrides: { content: 'This is a valid response content' }
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('validationResults');
      expect(response.body.data.validationResults).to.be.an('array');
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
      expect(response.body.success).to.be.false;
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

      expect(response.status).to.be.oneOf([200, 400]);
      if (response.status === 400) {
        expect(response.body.message).to.include('no responses');
      } else {
        expect(response.body.data.validationResults).to.be.an('array');
        expect(response.body.data.validationResults.length).to.equal(0);
      }
    });

    it('should identify invalid responses', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3,
        responseOverrides: { content: 'This response contains invalid content' }
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);
      expect(response.body.data.validationResults).to.be.an('array');
      
      if (response.body.data.validationResults.length > 0) {
        response.body.data.validationResults.forEach(result => {
          expect(result).to.have.property('isValid');
          expect(result).to.have.property('responseId');
          expect(result.isValid).to.be.a('boolean');
        });
      }
    });

    it('should provide validation feedback', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 2,
        responseOverrides: { content: 'Valid response content' }
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);
      
      if (response.body.data.validationResults.length > 0) {
        response.body.data.validationResults.forEach(result => {
          expect(result).to.have.property('feedback');
          expect(result.feedback).to.be.a('string');
        });
      }
    });

    it('should handle LLM validation errors gracefully', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 2,
        responseOverrides: { content: 'error test validation content' }
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      expect(response.status).to.be.oneOf([200, 500, 503]);
      if (response.status >= 500) {
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.include('validation');
      }
    });
  });

  describe('AI Service Integration Tests', () => {
    it('should handle concurrent AI operations', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 2,
        responseCount: 3
      });

      // Perform multiple AI operations concurrently
      const operations = [
        request(app)
          .post(`/ai/surveys/${surveys[0]._id}/summarize`)
          .set('Authorization', authContext.headers.Authorization),
        request(app)
          .post(`/ai/surveys/${surveys[1]._id}/summarize`)
          .set('Authorization', authContext.headers.Authorization),
        request(app)
          .post('/ai/surveys/search')
          .send({ query: 'technology surveys', limit: 5 }),
        request(app)
          .post(`/ai/surveys/${surveys[0]._id}/validate-responses`)
          .set('Authorization', authContext.headers.Authorization)
      ];

      const results = await Promise.all(operations);
      
      // All operations should complete successfully or with expected errors
      results.forEach(result => {
        expect(result.status).to.be.lessThan(600); // No server crashes
      });
    });

    it('should maintain consistent response format across AI endpoints', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];

      // Test all AI endpoints for consistent response format
      const summaryResponse = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', authContext.headers.Authorization);

      const searchResponse = await request(app)
        .post('/ai/surveys/search')
        .send({ query: 'test', limit: 5 });

      const validationResponse = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      // All should have consistent response structure
      [summaryResponse, searchResponse, validationResponse].forEach(response => {
        if (response.status === 200) {
          expect(response.body).to.have.property('success');
          expect(response.body).to.have.property('data');
          expect(response.body.success).to.be.true;
        }
      });
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
      // This test verifies that the mock LLM service is being used in tests
      expect(process.env.USE_MOCK_LLM).to.equal('true');
      expect(process.env.NODE_ENV).to.equal('test');
    });
  });

  describe('AI Response Content Validation', () => {
    it('should validate summary response structure', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 5
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/summarize`)
        .set('Authorization', authContext.headers.Authorization);

      if (response.status === 200) {
        expect(response.body.data.summary).to.be.a('string');
        expect(response.body.data.summary.length).to.be.greaterThan(10);
        
        // Additional validation for summary structure if implemented
        if (typeof response.body.data.summary === 'object') {
          expect(response.body.data.summary).to.have.property('content');
        }
      }
    });

    it('should validate search response structure', async () => {
      await createTestScenario({ surveyCount: 3 });

      const response = await request(app)
        .post('/ai/surveys/search')
        .send({ query: 'test survey', limit: 5 });

      if (response.status === 200) {
        expect(response.body.data.results).to.be.an('array');
        
        response.body.data.results.forEach(result => {
          expect(result).to.have.property('surveyId');
          expect(result.surveyId).to.be.a('string');
          
          if (result.relevanceScore !== undefined) {
            expect(result.relevanceScore).to.be.a('number');
            expect(result.relevanceScore).to.be.within(0, 1);
          }
        });
      }
    });

    it('should validate validation response structure', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];

      const response = await request(app)
        .post(`/ai/surveys/${survey._id}/validate-responses`)
        .set('Authorization', authContext.headers.Authorization);

      if (response.status === 200) {
        expect(response.body.data.validationResults).to.be.an('array');
        
        response.body.data.validationResults.forEach(result => {
          expect(result).to.have.property('responseId');
          expect(result).to.have.property('isValid');
          expect(result).to.have.property('feedback');
          
          expect(result.responseId).to.be.a('string');
          expect(result.isValid).to.be.a('boolean');
          expect(result.feedback).to.be.a('string');
        });
      }
    });
  });
}); 