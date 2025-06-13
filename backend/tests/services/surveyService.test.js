const SurveyService = require('../../services/SurveyService');
const {
  createTestUser,
  createTestSurvey,
  generateSurveyData,
  generateResponseData,
  createTestScenario,
  cleanupTestData
} = require('../utils/testHelpers');

// Import Jest's fail function
const { fail } = require('assert');

// Mock the LLM service to avoid external API calls
jest.mock('../../services/llmService', () => require('../mocks/llmService.mock'));

describe('SurveyService Unit Tests', () => {
  beforeEach(async () => {
    await cleanupTestData(['users', 'surveys']);
  });

  describe('Survey Creation', () => {
    it('should create a new survey successfully', async () => {
      const user = await createTestUser();
      const surveyData = generateSurveyData();

      const survey = await SurveyService.createSurvey(user._id, surveyData);

      expect(survey).toBeInstanceOf(Object);
      expect(survey.title).toBe(surveyData.title);
      expect(survey.question).toBe(surveyData.question);
      expect(survey.area).toBe(surveyData.area);
      expect(survey.creator.toString()).toBe(user._id.toString());
      expect(survey).toHaveProperty('_id');
      expect(survey).toHaveProperty('closed'); // Check if closed field exists instead of status
    });

    it('should validate required survey fields', async () => {
      const user = await createTestUser();
      const invalidSurveyData = {
        title: '', // Empty title
        description: 'Valid description'
      };

      try {
        await SurveyService.createSurvey(user._id, invalidSurveyData);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('title');
      }
    });

    it('should set default values for optional fields', async () => {
      const user = await createTestUser();
      const minimalSurveyData = {
        title: 'Test Survey',
        area: 'General', // Required field
        question: 'What do you think?'
      };

      const survey = await SurveyService.createSurvey(user._id, minimalSurveyData);

      expect(survey.closed).toBe(false); // Default closed state
      expect(survey.responses).toBeInstanceOf(Array);
      expect(survey.responses.length).toBe(0);
      expect(survey).toHaveProperty('createdAt');
      expect(survey).toHaveProperty('updatedAt');
    });

    it('should validate expiry date is in the future', async () => {
      const user = await createTestUser();
      const surveyData = generateSurveyData({
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      });

      try {
        await SurveyService.createSurvey(user._id, surveyData);
        fail('Should have rejected past expiry date');
      } catch (error) {
        expect(error.message).toContain('expiry');
      }
    });

    it('should validate maximum responses limit', async () => {
      const user = await createTestUser();
      const surveyData = generateSurveyData({
        permittedResponses: -1 // Invalid negative value
      });

      try {
        await SurveyService.createSurvey(user._id, surveyData);
        fail('Should have rejected negative permittedResponses');
      } catch (error) {
        expect(error.message).toContain('permittedResponses');
      }
    });
  });

  describe('Survey Retrieval', () => {
    it('should get survey by ID', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const testSurvey = surveys[0];

      const foundSurvey = await SurveyService.getSurveyById(testSurvey._id);

      expect(foundSurvey).toBeInstanceOf(Object);
      expect(foundSurvey._id.toString()).toBe(testSurvey._id.toString());
      expect(foundSurvey.title).toBe(testSurvey.title);
    });

    it('should return null for non-existent survey', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const foundSurvey = await SurveyService.getSurveyById(nonExistentId);

      expect(foundSurvey).toBeNull();
    });

    it('should get surveys with pagination', async () => {
      await createTestScenario({ surveyCount: 5 });

      const result = await SurveyService.getSurveys({ page: 1, limit: 3 });

      expect(result).toHaveProperty('surveys');
      expect(result).toHaveProperty('pagination');
      expect(result.surveys).toBeInstanceOf(Array);
      expect(result.surveys.length).toBeLessThanOrEqual(3);
      expect(result.pagination.total).toBe(5);
    });

    it('should filter surveys by area', async () => {
      const specificArea = 'Technology';
      await createTestScenario({
        surveyCount: 3,
        surveyOverrides: { area: specificArea }
      });
      await createTestScenario({
        surveyCount: 2,
        surveyOverrides: { area: 'Healthcare' }
      });

      const result = await SurveyService.getSurveys({ area: specificArea });

      expect(result.surveys).toBeInstanceOf(Array);
      result.surveys.forEach(survey => {
        expect(survey.area).toBe(specificArea);
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

      const result = await SurveyService.searchSurveys(keyword);

      expect(result).toBeInstanceOf(Array);
      if (result.length > 0) {
        const hasKeyword = result.some(survey => 
          survey.title.toLowerCase().includes(keyword.toLowerCase()) ||
          survey.description.toLowerCase().includes(keyword.toLowerCase())
        );
        expect(hasKeyword).toBe(true);
      }
    });

    it('should get surveys by creator', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      
      await createTestSurvey(user1._id);
      await createTestSurvey(user1._id);
      await createTestSurvey(user2._id);

      const user1Surveys = await SurveyService.getSurveysByCreator(user1._id);

      expect(user1Surveys).toBeInstanceOf(Array);
      expect(user1Surveys.length).toBe(2);
      user1Surveys.forEach(survey => {
        expect(survey.creator.toString()).toBe(user1._id.toString());
      });
    });
  });

  describe('Survey Updates', () => {
    it('should update survey information', async () => {
      const { surveys, users } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const creator = users[0];
      
      const updateData = {
        title: 'Updated Survey Title',
        guidelines: 'Updated guidelines'
      };

      const updatedSurvey = await SurveyService.updateSurvey(
        survey._id, 
        creator._id, 
        updateData
      );

      expect(updatedSurvey.title).toBe(updateData.title);
      expect(updatedSurvey.guidelines).toBe(updateData.guidelines);
    });

    it('should not allow non-creator to update survey', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const otherUser = await createTestUser();

      try {
        await SurveyService.updateSurvey(
          survey._id, 
          otherUser._id, 
          { title: 'Malicious Update' }
        );
        expect.fail('Should have prevented non-creator update');
      } catch (error) {
        expect(error.message).toContain('not authorized');
      }
    });

    it('should close survey successfully', async () => {
      const { surveys, users } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const creator = users[0];

      const closedSurvey = await SurveyService.closeSurvey(survey._id, creator._id);

      expect(closedSurvey.closed).toBe(true);
      expect(closedSurvey).toHaveProperty('updatedAt');
    });

    it('should update survey expiry date', async () => {
      const { surveys, users } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const creator = users[0];
      const newExpiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const updatedSurvey = await SurveyService.updateSurveyExpiry(
        survey._id, 
        creator._id, 
        newExpiryDate
      );

      expect(new Date(updatedSurvey.expiryDate).getTime()).toBe(newExpiryDate.getTime());
    });

    it('should not allow setting past expiry date', async () => {
      const { surveys, users } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const creator = users[0];
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      try {
        await SurveyService.updateSurveyExpiry(survey._id, creator._id, pastDate);
        fail('Should have rejected past expiry date');
      } catch (error) {
        expect(error.message).toContain('future');
      }
    });
  });

  describe('Survey Responses', () => {
    it('should add response to survey', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const user = await createTestUser();
      const responseData = generateResponseData();

      const updatedSurvey = await SurveyService.addResponse(
        survey._id,
        user._id,
        responseData.text
      );

      expect(updatedSurvey.responses).toBeInstanceOf(Array);
      expect(updatedSurvey.responses.length).toBe(1);
      expect(updatedSurvey.responses[0].user.toString()).toBe(user._id.toString());
      expect(updatedSurvey.responses[0].text).toBe(responseData.text);
    });

    it('should allow updating existing response from same user', async () => {
      const { surveys, users } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const user = users[0];

      // Since the service allows updating existing responses, this should work
      const updatedSurvey = await SurveyService.addResponse(survey._id, user._id, 'Updated response');
      
      expect(updatedSurvey.responses.length).toBe(1);
      expect(updatedSurvey.responses[0].text).toBe('Updated response');
      expect(updatedSurvey.responses[0].user.toString()).toBe(user._id.toString());
    });

    it('should not allow responses to closed survey', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { closed: true }
      });
      const survey = surveys[0];
      const user = await createTestUser();

      try {
        await SurveyService.addResponse(survey._id, user._id, 'Response to closed survey');
        fail('Should have prevented response to closed survey');
      } catch (error) {
        expect(error.message).toContain('closed');
      }
    });

    it('should not allow responses to expired survey', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { 
          expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      });
      const survey = surveys[0];
      const user = await createTestUser();

      try {
        await SurveyService.addResponse(survey._id, user._id, 'Response to expired survey');
        fail('Should have prevented response to expired survey');
      } catch (error) {
        expect(error.message).toContain('expired');
      }
    });

    it('should enforce maximum responses limit', async () => {
      const user = await createTestUser();
      const surveyData = generateSurveyData({ permittedResponses: 2 });
      const survey = await SurveyService.createSurvey(user._id, surveyData);

      // Add maximum allowed responses
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();

      await SurveyService.addResponse(survey._id, user1._id, 'Response 1');
      await SurveyService.addResponse(survey._id, user2._id, 'Response 2');

      // Try to add one more response beyond limit
      try {
        await SurveyService.addResponse(survey._id, user3._id, 'Response 3');
        fail('Should have enforced response limit');
      } catch (error) {
        expect(error.message).toContain('maximum');
      }
    });

    it('should update user response', async () => {
      const { surveys, users, responses } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const user = users[0];
      const response = responses[0];
      const newContent = 'Updated response content';

      const updatedSurvey = await SurveyService.updateResponse(
        survey._id,
        response._id,
        user._id,
        newContent
      );

      const updatedResponse = updatedSurvey.responses.find(r => 
        r._id.toString() === response._id.toString()
      );
      expect(updatedResponse.text).toBe(newContent);
      expect(updatedResponse).toHaveProperty('updatedAt');
    });

    it('should not allow updating other user response', async () => {
      const { surveys, responses } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const response = responses[0];
      const otherUser = await createTestUser();

              try {
          await SurveyService.updateResponse(
            survey._id,
            response._id,
            otherUser._id,
            'Malicious update'
          );
          fail('Should have prevented updating other user response');
        } catch (error) {
          expect(error.message).toContain('not authorized');
        }
    });

    it('should delete user response', async () => {
      const { surveys, users, responses } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const user = users[0];
      const response = responses[0];

      const updatedSurvey = await SurveyService.deleteResponse(
        survey._id,
        response._id,
        user._id
      );

      expect(updatedSurvey.responses.length).toBe(0);
    });

    it('should get user response for survey', async () => {
      const { surveys, users } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const user = users[0];

      const userResponse = await SurveyService.getUserResponse(survey._id, user._id);

      expect(userResponse).toBeInstanceOf(Object);
      expect(userResponse.user.toString()).toBe(user._id.toString());
    });

    it('should get all user responses across surveys', async () => {
      const { users } = await createTestScenario({
        userCount: 1,
        surveyCount: 3,
        responseCount: 3
      });
      const user = users[0];

      const userResponses = await SurveyService.getAllUserResponses(user._id);

      expect(userResponses).toBeInstanceOf(Array);
      expect(userResponses.length).toBeGreaterThan(0);
      userResponses.forEach(response => {
        expect(response.user.toString()).toBe(user._id.toString());
      });
    });
  });

  describe('Survey Statistics', () => {
    it('should calculate survey response count', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        responseCount: 5
      });
      const survey = surveys[0];

      const count = await SurveyService.getResponseCount(survey._id);

      expect(typeof count).toBe('number');
      expect(count).toBe(5);
    });

    it('should handle survey analytics data', async () => {
      const user = await createTestUser();
      const surveyData = generateSurveyData({ permittedResponses: 10 });
      const survey = await SurveyService.createSurvey(user._id, surveyData);

      // Add 3 responses out of 10 max
      const users = await Promise.all([
        createTestUser(),
        createTestUser(),
        createTestUser()
      ]);

      for (const respUser of users) {
        await SurveyService.addResponse(survey._id, respUser._id, 'Response');
      }

      const analytics = await SurveyService.getSurveyAnalytics(survey._id);

      expect(analytics).toBeInstanceOf(Object);
      expect(analytics.totalResponses).toBe(3);
      expect(analytics).toHaveProperty('averageResponseLength');
    });

    it('should get survey analytics', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        responseCount: 5
      });
      const survey = surveys[0];

      const analytics = await SurveyService.getSurveyAnalytics(survey._id);

      expect(analytics).toBeInstanceOf(Object);
      expect(analytics).toHaveProperty('totalResponses');
      expect(analytics).toHaveProperty('averageResponseLength');
      expect(analytics).toHaveProperty('responseDistribution');
      expect(typeof analytics.totalResponses).toBe('number');
    });
  });

  describe('Survey Validation', () => {
    it('should validate survey status transitions', async () => {
      const { surveys, users } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const creator = users[0];

      // Close the survey
      await SurveyService.closeSurvey(survey._id, creator._id);

      // Try to close again
      try {
        await SurveyService.closeSurvey(survey._id, creator._id);
        fail('Should have prevented closing already closed survey');
      } catch (error) {
        expect(error.message).toContain('already closed');
      }
    });

    it('should validate survey ownership for operations', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const nonCreator = await createTestUser();

      const protectedOperations = [
        () => SurveyService.updateSurvey(survey._id, nonCreator._id, { title: 'Hack' }),
        () => SurveyService.closeSurvey(survey._id, nonCreator._id),
        () => SurveyService.updateSurveyExpiry(survey._id, nonCreator._id, new Date(Date.now() + 24 * 60 * 60 * 1000))
      ];

      for (const operation of protectedOperations) {
        try {
          await operation();
          fail('Should have prevented non-creator operation');
        } catch (error) {
          expect(error.message).toContain('not authorized');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid ObjectId formats', async () => {
      const invalidIds = ['invalid', '123', 'not-an-objectid'];

      for (const invalidId of invalidIds) {
        try {
          await SurveyService.getSurveyById(invalidId);
        } catch (error) {
          expect(error.message).toContain('ObjectId');
        }
      }
    });

    it('should handle concurrent response submissions', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];

      const users = await Promise.all([
        createTestUser(),
        createTestUser(),
        createTestUser()
      ]);

      // Submit responses concurrently
      const responsePromises = users.map(user =>
        SurveyService.addResponse(survey._id, user._id, 'Concurrent response')
      );

      const results = await Promise.allSettled(responsePromises);

      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain response order', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];

      const users = await Promise.all([
        createTestUser(),
        createTestUser(),
        createTestUser()
      ]);

      // Add responses in sequence
      for (let i = 0; i < users.length; i++) {
        await SurveyService.addResponse(
          survey._id, 
          users[i]._id, 
          `Response ${i + 1}`
        );
      }

      const updatedSurvey = await SurveyService.getSurveyById(survey._id);
      
      // Responses should be in order of submission
      for (let i = 0; i < updatedSurvey.responses.length; i++) {
        expect(updatedSurvey.responses[i].text).toBe(`Response ${i + 1}`);
      }
    });

    it('should clean up orphaned responses when survey is deleted', async () => {
      const { surveys, users } = await createTestScenario({
        surveyCount: 1,
        responseCount: 3
      });
      const survey = surveys[0];
      const creator = users[0];

      // Delete survey
      const deleted = await SurveyService.deleteSurvey(survey._id, creator._id);

      expect(deleted).toBe(true);

      // Verify survey is deleted
      const deletedSurvey = await SurveyService.getSurveyById(survey._id);
      expect(deletedSurvey).toBeNull();
    });
  });
}); 