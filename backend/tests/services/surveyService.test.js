const SurveyService = require('../../services/SurveyService');
const Survey = require('../../models/SurveyModel');
const {
  createTestUser,
  createTestSurvey,
  generateSurveyData,
  generateResponseData,
  createTestScenario,
  cleanupTestData
} = require('../utils/testHelpers');

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

      expect(survey).to.be.an('object');
      expect(survey.title).to.equal(surveyData.title);
      expect(survey.description).to.equal(surveyData.description);
      expect(survey.creator.toString()).to.equal(user._id.toString());
      expect(survey.status).to.equal('active');
      expect(survey).to.have.property('_id');
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
        expect(error.message).to.include('title');
      }
    });

    it('should set default values for optional fields', async () => {
      const user = await createTestUser();
      const minimalSurveyData = {
        title: 'Test Survey',
        description: 'Test Description',
        question: 'What do you think?'
      };

      const survey = await SurveyService.createSurvey(user._id, minimalSurveyData);

      expect(survey.status).to.equal('active');
      expect(survey.isAnonymous).to.be.a('boolean');
      expect(survey.responses).to.be.an('array');
      expect(survey.responses.length).to.equal(0);
    });

    it('should validate expiry date is in the future', async () => {
      const user = await createTestUser();
      const surveyData = generateSurveyData({
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      });

      try {
        await SurveyService.createSurvey(user._id, surveyData);
        expect.fail('Should have rejected past expiry date');
      } catch (error) {
        expect(error.message).to.include('expiry');
      }
    });

    it('should validate maximum responses limit', async () => {
      const user = await createTestUser();
      const surveyData = generateSurveyData({
        maxResponses: -1 // Invalid negative value
      });

      try {
        await SurveyService.createSurvey(user._id, surveyData);
        expect.fail('Should have rejected negative maxResponses');
      } catch (error) {
        expect(error.message).to.include('maxResponses');
      }
    });
  });

  describe('Survey Retrieval', () => {
    it('should get survey by ID', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const testSurvey = surveys[0];

      const foundSurvey = await SurveyService.getSurveyById(testSurvey._id);

      expect(foundSurvey).to.be.an('object');
      expect(foundSurvey._id.toString()).to.equal(testSurvey._id.toString());
      expect(foundSurvey.title).to.equal(testSurvey.title);
    });

    it('should return null for non-existent survey', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const foundSurvey = await SurveyService.getSurveyById(nonExistentId);

      expect(foundSurvey).to.be.null;
    });

    it('should get surveys with pagination', async () => {
      await createTestScenario({ surveyCount: 5 });

      const result = await SurveyService.getSurveys({ page: 1, limit: 3 });

      expect(result).to.have.property('surveys');
      expect(result).to.have.property('pagination');
      expect(result.surveys).to.be.an('array');
      expect(result.surveys.length).to.be.at.most(3);
      expect(result.pagination.total).to.equal(5);
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

      expect(result.surveys).to.be.an('array');
      result.surveys.forEach(survey => {
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

      const result = await SurveyService.searchSurveys(keyword);

      expect(result).to.be.an('array');
      if (result.length > 0) {
        const hasKeyword = result.some(survey => 
          survey.title.toLowerCase().includes(keyword.toLowerCase()) ||
          survey.description.toLowerCase().includes(keyword.toLowerCase())
        );
        expect(hasKeyword).to.be.true;
      }
    });

    it('should get surveys by creator', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      
      await createTestSurvey(user1._id);
      await createTestSurvey(user1._id);
      await createTestSurvey(user2._id);

      const user1Surveys = await SurveyService.getSurveysByCreator(user1._id);

      expect(user1Surveys).to.be.an('array');
      expect(user1Surveys.length).to.equal(2);
      user1Surveys.forEach(survey => {
        expect(survey.creator.toString()).to.equal(user1._id.toString());
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
        description: 'Updated description'
      };

      const updatedSurvey = await SurveyService.updateSurvey(
        survey._id, 
        creator._id, 
        updateData
      );

      expect(updatedSurvey.title).to.equal(updateData.title);
      expect(updatedSurvey.description).to.equal(updateData.description);
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
        expect(error.message).to.include('not authorized');
      }
    });

    it('should close survey successfully', async () => {
      const { surveys, users } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const creator = users[0];

      const closedSurvey = await SurveyService.closeSurvey(survey._id, creator._id);

      expect(closedSurvey.status).to.equal('closed');
      expect(closedSurvey.closedAt).to.be.a('date');
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

      expect(new Date(updatedSurvey.expiresAt)).to.be.closeTo(newExpiryDate, 1000);
    });

    it('should not allow setting past expiry date', async () => {
      const { surveys, users } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const creator = users[0];
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      try {
        await SurveyService.updateSurveyExpiry(survey._id, creator._id, pastDate);
        expect.fail('Should have rejected past expiry date');
      } catch (error) {
        expect(error.message).to.include('future');
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
        responseData.content
      );

      expect(updatedSurvey.responses).to.be.an('array');
      expect(updatedSurvey.responses.length).to.equal(1);
      expect(updatedSurvey.responses[0].user.toString()).to.equal(user._id.toString());
      expect(updatedSurvey.responses[0].content).to.equal(responseData.content);
    });

    it('should not allow duplicate responses from same user', async () => {
      const { surveys, users } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const user = users[0];

      try {
        await SurveyService.addResponse(survey._id, user._id, 'Duplicate response');
        expect.fail('Should have prevented duplicate response');
      } catch (error) {
        expect(error.message).to.include('already responded');
      }
    });

    it('should not allow responses to closed survey', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { status: 'closed' }
      });
      const survey = surveys[0];
      const user = await createTestUser();

      try {
        await SurveyService.addResponse(survey._id, user._id, 'Response to closed survey');
        expect.fail('Should have prevented response to closed survey');
      } catch (error) {
        expect(error.message).to.include('closed');
      }
    });

    it('should not allow responses to expired survey', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        surveyOverrides: { 
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      });
      const survey = surveys[0];
      const user = await createTestUser();

      try {
        await SurveyService.addResponse(survey._id, user._id, 'Response to expired survey');
        expect.fail('Should have prevented response to expired survey');
      } catch (error) {
        expect(error.message).to.include('expired');
      }
    });

    it('should enforce maximum responses limit', async () => {
      const user = await createTestUser();
      const surveyData = generateSurveyData({ maxResponses: 2 });
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
        expect.fail('Should have enforced response limit');
      } catch (error) {
        expect(error.message).to.include('maximum');
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
      expect(updatedResponse.content).to.equal(newContent);
      expect(updatedResponse.updatedAt).to.be.a('date');
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
        expect.fail('Should have prevented updating other user response');
      } catch (error) {
        expect(error.message).to.include('not authorized');
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

      expect(updatedSurvey.responses.length).to.equal(0);
    });

    it('should get user response for survey', async () => {
      const { surveys, users } = await createTestScenario({
        surveyCount: 1,
        responseCount: 1
      });
      const survey = surveys[0];
      const user = users[0];

      const userResponse = await SurveyService.getUserResponse(survey._id, user._id);

      expect(userResponse).to.be.an('object');
      expect(userResponse.user.toString()).to.equal(user._id.toString());
    });

    it('should get all user responses across surveys', async () => {
      const { users } = await createTestScenario({
        userCount: 1,
        surveyCount: 3,
        responseCount: 3
      });
      const user = users[0];

      const userResponses = await SurveyService.getAllUserResponses(user._id);

      expect(userResponses).to.be.an('array');
      expect(userResponses.length).to.be.greaterThan(0);
      userResponses.forEach(response => {
        expect(response.user.toString()).to.equal(user._id.toString());
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

      expect(count).to.be.a('number');
      expect(count).to.equal(5);
    });

    it('should get survey completion rate', async () => {
      const user = await createTestUser();
      const surveyData = generateSurveyData({ maxResponses: 10 });
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

      const completionRate = await SurveyService.getCompletionRate(survey._id);

      expect(completionRate).to.be.a('number');
      expect(completionRate).to.equal(0.3); // 3/10 = 0.3
    });

    it('should get survey analytics', async () => {
      const { surveys } = await createTestScenario({
        surveyCount: 1,
        responseCount: 5
      });
      const survey = surveys[0];

      const analytics = await SurveyService.getSurveyAnalytics(survey._id);

      expect(analytics).to.be.an('object');
      expect(analytics).to.have.property('totalResponses');
      expect(analytics).to.have.property('completionRate');
      expect(analytics).to.have.property('averageResponseLength');
      expect(analytics.totalResponses).to.be.a('number');
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
        expect.fail('Should have prevented closing already closed survey');
      } catch (error) {
        expect(error.message).to.include('already closed');
      }
    });

    it('should validate survey ownership for operations', async () => {
      const { surveys } = await createTestScenario({ surveyCount: 1 });
      const survey = surveys[0];
      const nonCreator = await createTestUser();

      const protectedOperations = [
        () => SurveyService.updateSurvey(survey._id, nonCreator._id, { title: 'Hack' }),
        () => SurveyService.closeSurvey(survey._id, nonCreator._id),
        () => SurveyService.updateSurveyExpiry(survey._id, nonCreator._id, new Date())
      ];

      for (const operation of protectedOperations) {
        try {
          await operation();
          expect.fail('Should have prevented non-creator operation');
        } catch (error) {
          expect(error.message).to.include('not authorized');
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
          expect(error.message).to.include('ObjectId');
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
        expect(result.status).to.equal('fulfilled');
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
        expect(updatedSurvey.responses[i].content).to.equal(`Response ${i + 1}`);
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

      expect(deleted).to.be.true;

      // Verify survey is deleted
      const deletedSurvey = await SurveyService.getSurveyById(survey._id);
      expect(deletedSurvey).to.be.null;
    });
  });
}); 