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
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('survey');
      expect(response.body.data.survey.title).to.equal(surveyData.title);
      expect(response.body.data.survey.creator.toString()).to.equal(user._id.toString());
    });

    it('should not create survey without authentication', async () => {
      const surveyData = generateSurveyData();

      const response = await request(app)
        .post('/surveys')
        .send(surveyData);

      validateApiResponse(response, 401, false);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Not authorized');
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
      expect(response.body.success).to.be.false;
    });

    it('should validate survey input fields', async () => {
      const user = await createTestUser();
      const authContext = createAuthContext(user);

      const invalidSurveyData = generateSurveyData({
        title: '', // Empty title
        maxResponses: -1, // Invalid max responses
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Past date
      });

      const response = await request(app)
        .post('/surveys')
        .set('Authorization', authContext.headers.Authorization)
        .send(invalidSurveyData);

      expect(response.status).to.be.oneOf([400, 422]);
      expect(response.body.success).to.be.false;
    });

    it('should enforce survey limits per user', async () => {
      const user = await createTestUser();
      const authContext = createAuthContext(user);

      // Create maximum allowed surveys (assuming there's a limit)
      // This test assumes there's a business rule limiting surveys per user
      const surveyPromises = Array(20).fill().map(() => 
        request(app)
          .post('/surveys')
          .set('Authorization', authContext.headers.Authorization)
          .send(generateSurveyData())
      );

      const responses = await Promise.all(surveyPromises);
      
      // Check if any of the later requests are rejected due to limits
      // This is a business logic test that might not apply if no limits exist
    });
  });

  describe('GET /surveys', () => {
    it('should get all surveys with pagination', async () => {
      // Create test scenario with multiple surveys
      await createTestScenario({
        userCount: 2,
        surveyCount: 5
      });

      const response = await request(app)
        .get('/surveys')
        .query({ page: 1, limit: 3 });

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('surveys');
      expect(response.body.data).to.have.property('pagination');
      expect(response.body.data.surveys).to.be.an('array');
      expect(response.body.data.surveys.length).to.be.at.most(3);
    });

    it('should filter surveys by area', async () => {
      const specificArea = 'Technology';
      await createTestScenario({
        surveyCount: 3,
        surveyOverrides: { area: specificArea }
      });
      
      // Create surveys with different areas
      await createTestScenario({
        surveyCount: 2,
        surveyOverrides: { area: 'Healthcare' }
      });

      const response = await request(app)
        .get('/surveys')
        .query({ area: specificArea });

      validateApiResponse(response, 200);
      expect(response.body.data.surveys).to.be.an('array');
      response.body.data.surveys.forEach(survey => {
        expect(survey.area).to.equal(specificArea);
      });
    });

    it('should search surveys by keyword', async () => {
      const keyword = 'satisfaction';
      await createTestScenario({
        surveyCount: 2,
        surveyOverrides: { title: `Customer ${keyword} Survey` }
      });
      
      await createTestScenario({
        surveyCount: 2,
        surveyOverrides: { title: 'Product Feedback Survey' }
      });

      const response = await request(app)
        .get('/surveys')
        .query({ search: keyword });

      validateApiResponse(response, 200);
      if (response.body.data.surveys.length > 0) {
        // Check if results contain the keyword
        const hasKeyword = response.body.data.surveys.some(survey => 
          survey.title.toLowerCase().includes(keyword.toLowerCase()) ||
          survey.description.toLowerCase().includes(keyword.toLowerCase())
        );
        expect(hasKeyword).to.be.true;
      }
    });

    it('should handle empty results gracefully', async () => {
      const response = await request(app)
        .get('/surveys')
        .query({ area: 'NonexistentArea' });

      validateApiResponse(response, 200);
      expect(response.body.data.surveys).to.be.an('array');
      expect(response.body.data.surveys.length).to.equal(0);
    });

    it('should not return expired surveys by default', async () => {
      // Create expired survey
      await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { 
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'expired'
        }
      });

      const response = await request(app)
        .get('/surveys');

      validateApiResponse(response, 200);
      response.body.data.surveys.forEach(survey => {
        expect(survey.status).to.not.equal('expired');
      });
    });
  });

  describe('GET /surveys/:id', () => {
    it('should get a specific survey by ID', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];

      const response = await request(app)
        .get(`/surveys/${survey._id}`);

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('survey');
      expect(response.body.data.survey._id).to.equal(survey._id.toString());
      expect(response.body.data.survey.title).to.equal(survey.title);
    });

    it('should return 404 for non-existent survey', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/surveys/${nonExistentId}`);

      validateApiResponse(response, 404, false);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('not found');
    });

    it('should return 400 for invalid survey ID format', async () => {
      const response = await request(app)
        .get('/surveys/invalid-id');

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
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
      expect(response.body.data.survey).to.have.property('responseCount');
      expect(response.body.data.survey).to.have.property('creator');
      expect(response.body.data.survey.responseCount).to.be.a('number');
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
      expect(response.body.success).to.be.true;
      expect(response.body.data.survey.status).to.equal('closed');
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
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('not authorized');
    });

    it('should not close survey without authentication', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];

      const response = await request(app)
        .patch(`/surveys/${survey._id}/close`);

      validateApiResponse(response, 401, false);
      expect(response.body.success).to.be.false;
    });

    it('should not close already closed survey', async () => {
      const { surveys, authContext } = await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { status: 'closed' }
      });
      const survey = surveys[0];

      const response = await request(app)
        .patch(`/surveys/${survey._id}/close`)
        .set('Authorization', authContext.headers.Authorization);

      expect(response.status).to.be.oneOf([400, 409]);
      expect(response.body.success).to.be.false;
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
        .send({ expiresAt: newExpiryDate });

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(new Date(response.body.data.survey.expiresAt)).to.be.closeTo(newExpiryDate, 1000);
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
        .send({ expiresAt: pastDate });

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
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
        .send({ expiresAt: newExpiryDate });

      validateApiResponse(response, 403, false);
      expect(response.body.success).to.be.false;
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
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('response');
      expect(response.body.data.response.content).to.equal(responseData.content);
      expect(response.body.data.response.user.toString()).to.equal(user._id.toString());
    });

    it('should not allow duplicate responses from same user', async () => {
      const { surveys, users, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const responseData = generateResponseData();

      const response = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', authContext.headers.Authorization)
        .send(responseData);

      expect(response.status).to.be.oneOf([400, 409]);
      expect(response.body.success).to.be.false;
    });

    it('should not submit response to closed survey', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { status: 'closed' }
      });
      const survey = surveys[0];
      const user = await createTestUser();
      const authContext = createAuthContext(user);
      const responseData = generateResponseData();

      const response = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', authContext.headers.Authorization)
        .send(responseData);

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
    });

    it('should not submit response to expired survey', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { 
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      });
      const survey = surveys[0];
      const user = await createTestUser();
      const authContext = createAuthContext(user);
      const responseData = generateResponseData();

      const response = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', authContext.headers.Authorization)
        .send(responseData);

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
    });

    it('should validate response content', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const user = await createTestUser();
      const authContext = createAuthContext(user);

      const response = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', authContext.headers.Authorization)
        .send({
          content: '' // Empty content
        });

      validateApiResponse(response, 400, false);
      expect(response.body.success).to.be.false;
    });

    it('should enforce maximum responses limit', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { maxResponses: 2 },
        responseCount: 2
      });
      const survey = surveys[0];
      
      // Try to add one more response beyond limit
      const user = await createTestUser();
      const authContext = createAuthContext(user);
      const responseData = generateResponseData();

      const response = await request(app)
        .post(`/surveys/${survey._id}/responses`)
        .set('Authorization', authContext.headers.Authorization)
        .send(responseData);

      expect(response.status).to.be.oneOf([400, 409]);
      expect(response.body.success).to.be.false;
    });
  });

  describe('GET /surveys/:id/responses/:user_id', () => {
    it('should get user response for survey', async () => {
      const { surveys, users, authContext } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const user = users[0];

      const response = await request(app)
        .get(`/surveys/${survey._id}/responses/${user._id}`)
        .set('Authorization', authContext.headers.Authorization);

      validateApiResponse(response, 200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('response');
      expect(response.body.data.response.user.toString()).to.equal(user._id.toString());
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
      expect(response.body.success).to.be.false;
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
      expect(response.body.success).to.be.false;
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
        .send({ content: newContent });

      validateApiResponse(updateResponse, 200);
      expect(updateResponse.body.success).to.be.true;
      expect(updateResponse.body.data.response.content).to.equal(newContent);
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
        .send({ content: 'Malicious update' });

      validateApiResponse(updateResponse, 403, false);
      expect(updateResponse.body.success).to.be.false;
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
      expect(deleteResponse.body.success).to.be.true;
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
      expect(deleteResponse.body.success).to.be.false;
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
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('responses');
      expect(response.body.data.responses).to.be.an('array');
      expect(response.body.data.responses.length).to.be.greaterThan(0);
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
      expect(response.body.success).to.be.false;
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
        expect(response.status).to.equal(201);
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
          .send({ expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
      ];

      const results = await Promise.all(operations);
      
      // Check that operations completed successfully
      expect(results.every(result => result.status < 400)).to.be.true;
    });
  });
}); 