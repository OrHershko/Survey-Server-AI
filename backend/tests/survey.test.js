const request = require('supertest');
const app = require('../server');
const Survey = require('../models/SurveyModel');
const {
  generateSurveyData,
  generateResponseData,
  createTestUser,
  createTestSurvey,
  createAuthContext,
  createTestScenario,
  validateApiResponse,
  cleanupTestData
} = require('./utils/testHelpers');

// Mock the LLM service to avoid external API calls
jest.mock('../services/llmService', () => require('./mocks/llmService.mock'));

describe('Survey API Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(['users', 'surveys']);
  });

  describe('POST /surveys', () => {
    it('should create a new survey successfully', async () => {
      const user = await createTestUser();
      const authContext = createAuthContext(user);
      const surveyData = generateSurveyData();

      const response = await request(app)
        .post('/surveys')
        .set('Authorization', authContext.headers.Authorization)
        .send(surveyData);

      validateApiResponse(response, 201);
      
      expect(response.body).toHaveProperty('title');
      expect(response.body.title).toBe(surveyData.title);
      expect(response.body.creator.toString()).toBe(user._id.toString());
    });

    it('should not create survey without authentication', async () => {
      const surveyData = generateSurveyData();

      const response = await request(app)
        .post('/surveys')
        .send(surveyData);

      validateApiResponse(response, 401, false);
      
      expect(response.body.message).toContain('Not authorized');
    });

    it('should not create survey with invalid data', async () => {
      const user = await createTestUser();
      const authContext = createAuthContext(user);

      const response = await request(app)
        .post('/surveys')
        .set('Authorization', authContext.headers.Authorization)
        .send({
          // Missing required fields
          title: '',
          description: ''
        });

      validateApiResponse(response, 400, false);
      
    });

    it('should return 500 for invalid survey ID format', async () => {
      const response = await request(app)
        .get('/surveys/invalid-id');

      validateApiResponse(response, 500, false);
      
    });

    it('should include response count and creator info', async () => {
      const { surveys, users } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];

      const response = await request(app)
        .get(`/surveys/${survey._id}`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('responseCount');
      expect(response.body).toHaveProperty('creator');
      expect(typeof response.body.responseCount).toBe('number');
    });
  });

  describe('PATCH /surveys/:id/close', () => {
    it('should close survey by creator', async () => {
      const { surveys, users, authContext } = await createTestScenario({ 
        surveyCount: 1 
      });
      const survey = surveys[0];

      const response = await request(app)
        .patch(`/surveys/${survey._id}/close`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);
      
      expect(response.body.survey.closed).toBe(true);
    });

    it('should not allow non-creator to close survey', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      
      // Create different user
      const otherUser = await createTestUser();
      const otherAuthContext = createAuthContext(otherUser);

      const response = await request(app)
        .patch(`/surveys/${survey._id}/close`)
        .set('Authorization', otherAuthContext.headers.Authorization);

      validateApiResponse(response, 403, false);
      
      expect(response.body.message).toContain('Not authorized');
    });

    it('should not close survey without authentication', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];

      const response = await request(app)
        .patch(`/surveys/${survey._id}/close`);

      validateApiResponse(response, 401, false);
      
    });

    it('should not close already closed survey', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { closed: true }
      });
      const survey = surveys[0];

      const response = await request(app)
        .patch(`/surveys/${survey._id}/close`)
        .set('Authorization', authContext.headers.Authorization);

      expect(response.status).toBe(200);
      
    });
  });

  describe('PATCH /surveys/:id/expiry', () => {
    it('should update survey expiry date', async () => {
      const { surveys, authContext } = await createTestScenario({ 
        surveyCount: 1 
      });
      const survey = surveys[0];
      const newExpiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

      const response = await request(app)
        .patch(`/surveys/${survey._id}/expiry`)
        .set('Authorization', authContext.headers.Authorization)
        .send({ expiryDate: newExpiryDate });

      validateApiResponse(response, 200);
      
      expect(Math.abs(new Date(response.body.survey.expiryDate).getTime() - newExpiryDate.getTime())).toBeLessThan(10000);
    });

    it('should not allow setting past expiry date', async () => {
      const { surveys, authContext } = await createTestScenario({ 
        surveyCount: 1 
      });
      const survey = surveys[0];
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      const response = await request(app)
        .patch(`/surveys/${survey._id}/expiry`)
        .set('Authorization', authContext.headers.Authorization)
        .send({ expiryDate: pastDate });

      validateApiResponse(response, 400, false);
      
    });

    it('should not allow non-creator to update expiry', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      
      const otherUser = await createTestUser();
      const otherAuthContext = createAuthContext(otherUser);
      const newExpiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .patch(`/surveys/${survey._id}/expiry`)
        .set('Authorization', otherAuthContext.headers.Authorization)
        .send({ expiryDate: newExpiryDate });

      validateApiResponse(response, 403, false);
      
    });
  });

  describe('POST /surveys/:id/responses', () => {
    it('should submit a response to survey', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const user = await createTestUser();
      const authContext = createAuthContext(user);
      const responseData = generateResponseData();

      const response = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', authContext.headers.Authorization)
        .send(responseData);

      validateApiResponse(response, 201);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('response');
      expect(response.body.response).toHaveProperty('_id');
      expect(response.body.response).toHaveProperty('text');
    });

    it('should not allow user to view other user responses', async () => {
      const { surveys, users } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const user = users[0];
      
      const otherUser = await createTestUser();
      const otherAuthContext = createAuthContext(otherUser);

      const response = await request(app)
        .get(`/surveys/${survey._id}/responses/${user._id}`)
        .set('Authorization', otherAuthContext.headers.Authorization);

      validateApiResponse(response, 403, false);
      
    });

    it('should return 404 if user has no response', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const user = await createTestUser();
      const authContext = createAuthContext(user);

      const response = await request(app)
        .get(`/surveys/${survey._id}/responses/${user._id}`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 404, false);
      
    });
  });

  describe('PUT /surveys/:id/responses/:responseId', () => {
    it('should update user response', async () => {
      const { surveys, users, authContext, responses } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const response = responses[0];
      const newContent = 'Updated response content';

      const updateResponse = await request(app)
        .put(`/surveys/${survey._id}/responses/${response._id}`)
        .set('Authorization', authContext.headers.Authorization)
        .send({ text: newContent });

      validateApiResponse(updateResponse, 200);
      expect(updateResponse.body).toHaveProperty('message');
      expect(updateResponse.body).toHaveProperty('response');
      expect(updateResponse.body.response.text).toBe(newContent);
    });

    it('should not allow updating other user response', async () => {
      const { surveys, responses } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const response = responses[0];
      
      const otherUser = await createTestUser();
      const otherAuthContext = createAuthContext(otherUser);

      const updateResponse = await request(app)
        .put(`/surveys/${survey._id}/responses/${response._id}`)
        .set('Authorization', otherAuthContext.headers.Authorization)
        .send({ text: 'Malicious update' });

      validateApiResponse(updateResponse, 403, false);
      expect(updateResponse.body).toHaveProperty('message');
    });
  });

  describe('DELETE /surveys/:id/responses/:responseId', () => {
    it('should delete user response', async () => {
      const { surveys, authContext, responses } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const response = responses[0];

      const deleteResponse = await request(app)
        .delete(`/surveys/${survey._id}/responses/${response._id}`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(deleteResponse, 200);
      expect(deleteResponse.body).toHaveProperty('message');
    });

    it('should not allow deleting other user response', async () => {
      const { surveys, responses } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const response = responses[0];
      
      const otherUser = await createTestUser();
      const otherAuthContext = createAuthContext(otherUser);

      const deleteResponse = await request(app)
        .delete(`/surveys/${survey._id}/responses/${response._id}`)
        .set('Authorization', otherAuthContext.headers.Authorization);

      validateApiResponse(deleteResponse, 403, false);
      expect(deleteResponse.body).toHaveProperty('message');
    });
  });

  describe('GET /surveys/responses/:user_id', () => {
    it('should get all user responses across surveys', async () => {
      const { users, authContext } = await createTestScenario({
        userCount: 1,
        surveyCount: 3,
        responseCount: 3
      });
      const user = users[0];

      const response = await request(app)
        .get(`/surveys/responses/${user._id}`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);
      
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach(resp => {
        expect(resp).toHaveProperty('_id');
        expect(resp).toHaveProperty('text');
        expect(resp).toHaveProperty('survey');
      });
    });

    it('should not allow viewing other user responses', async () => {
      const { users } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const user = users[0];
      
      const otherUser = await createTestUser();
      const otherAuthContext = createAuthContext(otherUser);

      const response = await request(app)
        .get(`/surveys/responses/${user._id}`)
        .set('Authorization', otherAuthContext.headers.Authorization);

      validateApiResponse(response, 403, false);
      
    });
  });

  describe('Survey Business Logic Tests', () => {
    it('should handle concurrent response submissions', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      
      // Create multiple users
      const users = await Promise.all(
        Array(5).fill().map(() => createTestUser())
      );

      // Submit responses concurrently
      const responsePromises = users.map(user => {
        const authContext = createAuthContext(user);
        return request(app)
          .post(`/surveys/${survey._id}/responses`)
          .set('Authorization', authContext.headers.Authorization)
          .send(generateResponseData());
      });

      const responses = await Promise.all(responsePromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });

    it('should maintain data integrity with many operations', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1
      });
      const survey = surveys[0];

      // Perform various operations concurrently
      const operations = [
        // Submit responses
        ...Array(3).fill().map(async () => {
          const user = await createTestUser();
          const userAuthContext = createAuthContext(user);
          return request(app)
            .post(`/surveys/${survey._id}/responses`)
            .set('Authorization', userAuthContext.headers.Authorization)
            .send(generateResponseData());
        }),
        // Get survey
        request(app).get(`/surveys/${survey._id}`),
        // Update expiry
        request(app)
          .patch(`/surveys/${survey._id}/expiry`)
          .set('Authorization', authContext.headers.Authorization)
          .send({ expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
      ];

      const results = await Promise.all(operations);
      
      // Check that operations completed successfully
      expect(results.every(result => result.status < 400)).toBe(true);
    });
  });
}); 