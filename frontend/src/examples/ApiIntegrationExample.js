import React, { useState, useEffect } from 'react';
import { useAuth, useSurveys, useAI } from '../hooks';
import { apiNotifications, notify } from '../utils/notifications';

/**
 * Example component demonstrating API integration usage
 * This shows how to use the services, hooks, and utilities together
 */
const ApiIntegrationExample = () => {
  const { user, login, logout, isAuthenticated } = useAuth();
  const {
    surveys,
    currentSurvey,
    loading: surveysLoading,
    error: surveysError,
    fetchSurveys,
    fetchSurveyById,
    createSurvey,
    submitResponse,
    clearError: clearSurveysError
  } = useSurveys();
  
  const {
    searchResults,
    loading: aiLoading,
    error: aiError,
    searchSurveys,
    generateSummary,
    validateResponses,
    clearError: clearAiError
  } = useAI();

  const [searchQuery, setSearchQuery] = useState('');
  const [responseText, setResponseText] = useState('');

  // Load surveys on component mount
  useEffect(() => {
    fetchSurveys().catch(error => {
      console.error('Failed to load surveys:', error);
    });
  }, [fetchSurveys]);

  // Example: Login handler
  const handleLogin = async (email, password) => {
    try {
      await login(email, password);
      apiNotifications.auth.loginSuccess(user?.username || 'User');
    } catch (error) {
      apiNotifications.auth.loginError(error.message);
    }
  };

  // Example: Create survey handler
  const handleCreateSurvey = async () => {
    const surveyData = {
      title: 'Example Survey',
      area: 'Technology',
      question: 'What do you think about AI in software development?',
      guidelines: 'Please provide thoughtful, constructive feedback.',
      permittedDomains: ['technology', 'software', 'ai'],
      permittedResponses: 100,
      summaryInstructions: 'Summarize the main themes and opinions.',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };

    try {
      await createSurvey(surveyData);
      apiNotifications.survey.created();
    } catch (error) {
      apiNotifications.survey.createError(error.message);
    }
  };

  // Example: Submit response handler
  const handleSubmitResponse = async (surveyId) => {
    if (!responseText.trim()) {
      notify.warning('Empty Response', 'Please enter a response before submitting.');
      return;
    }

    try {
      await submitResponse(surveyId, { content: responseText });
      apiNotifications.survey.responseSubmitted();
      setResponseText('');
    } catch (error) {
      apiNotifications.survey.responseError(error.message);
    }
  };

  // Example: Search surveys handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      notify.warning('Empty Search', 'Please enter a search query.');
      return;
    }

    try {
      const response = await searchSurveys(searchQuery, 10);
      apiNotifications.ai.searchCompleted(response.results?.length || 0);
    } catch (error) {
      apiNotifications.ai.searchError(error.message);
    }
  };

  // Example: Generate summary handler
  const handleGenerateSummary = async (surveyId) => {
    try {
      // Show loading notification
      const loadingNotification = apiNotifications.ai.summaryGenerating();
      
      await generateSummary(surveyId);
      
      // Dismiss loading notification and show success
      apiNotifications.ai.summaryGenerated();
    } catch (error) {
      apiNotifications.ai.summaryError(error.message);
    }
  };

  // Example: Validate responses handler
  const handleValidateResponses = async (surveyId) => {
    try {
      const response = await validateResponses(surveyId);
      const issueCount = response.validation?.issues?.length || 0;
      apiNotifications.ai.validationCompleted(issueCount);
    } catch (error) {
      apiNotifications.ai.validationError(error.message);
    }
  };

  // Example: Error handling
  const handleClearErrors = () => {
    clearSurveysError();
    clearAiError();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>API Integration Example</h1>
      
      {/* Authentication Section */}
      <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd' }}>
        <h2>Authentication</h2>
        {isAuthenticated ? (
          <div>
            <p>Welcome, {user?.username || 'User'}!</p>
            <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <div>
            <p>Please log in to continue</p>
            <button onClick={() => handleLogin('test@example.com', 'password')}>
              Login (Demo)
            </button>
          </div>
        )}
      </section>

      {/* Survey Management Section */}
      <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd' }}>
        <h2>Survey Management</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <button onClick={handleCreateSurvey} disabled={surveysLoading}>
            {surveysLoading ? 'Creating...' : 'Create Example Survey'}
          </button>
        </div>

        <div>
          <h3>Surveys ({surveys.length})</h3>
          {surveysLoading && <p>Loading surveys...</p>}
          {surveysError && (
            <div style={{ color: 'red' }}>
              Error: {surveysError}
              <button onClick={handleClearErrors}>Clear Error</button>
            </div>
          )}
          
          {surveys.map(survey => (
            <div key={survey._id} style={{ 
              margin: '10px 0', 
              padding: '10px', 
              border: '1px solid #eee',
              borderRadius: '4px'
            }}>
              <h4>{survey.title}</h4>
              <p>{survey.question}</p>
              <p>Area: {survey.area}</p>
              <p>Responses: {survey.responses?.length || 0}</p>
              
              <div style={{ marginTop: '10px' }}>
                <button 
                  onClick={() => fetchSurveyById(survey._id)}
                  style={{ marginRight: '10px' }}
                >
                  View Details
                </button>
                
                {user?._id === survey.creator && (
                  <>
                    <button 
                      onClick={() => handleGenerateSummary(survey._id)}
                      disabled={aiLoading}
                      style={{ marginRight: '10px' }}
                    >
                      Generate Summary
                    </button>
                    
                    <button 
                      onClick={() => handleValidateResponses(survey._id)}
                      disabled={aiLoading}
                    >
                      Validate Responses
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Response Submission Section */}
      {currentSurvey && (
        <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd' }}>
          <h2>Submit Response</h2>
          <h3>{currentSurvey.title}</h3>
          <p>{currentSurvey.question}</p>
          <p><strong>Guidelines:</strong> {currentSurvey.guidelines}</p>
          
          <div style={{ marginTop: '15px' }}>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Enter your response here..."
              rows={4}
              style={{ width: '100%', marginBottom: '10px' }}
            />
            
            <button 
              onClick={() => handleSubmitResponse(currentSurvey._id)}
              disabled={surveysLoading || !responseText.trim()}
            >
              {surveysLoading ? 'Submitting...' : 'Submit Response'}
            </button>
          </div>
        </section>
      )}

      {/* AI Search Section */}
      <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd' }}>
        <h2>AI-Powered Search</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search surveys with natural language..."
            style={{ width: '70%', marginRight: '10px' }}
          />
          <button 
            onClick={handleSearch}
            disabled={aiLoading || !searchQuery.trim()}
          >
            {aiLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {aiError && (
          <div style={{ color: 'red', marginBottom: '15px' }}>
            Error: {aiError}
            <button onClick={handleClearErrors}>Clear Error</button>
          </div>
        )}

        <div>
          <h3>Search Results ({searchResults.length})</h3>
          {searchResults.map((result, index) => (
            <div key={index} style={{ 
              margin: '10px 0', 
              padding: '10px', 
              border: '1px solid #eee',
              borderRadius: '4px'
            }}>
              <h4>{result.survey?.title || result.title}</h4>
              <p>{result.survey?.question || result.question}</p>
              {result.reason && <p><strong>Match Reason:</strong> {result.reason}</p>}
              {result.relevanceScore && (
                <p><strong>Relevance:</strong> {Math.round(result.relevanceScore * 100)}%</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Loading States */}
      {(surveysLoading || aiLoading) && (
        <div style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          background: '#f0f0f0', 
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          {surveysLoading && <p>Survey operation in progress...</p>}
          {aiLoading && <p>AI operation in progress...</p>}
        </div>
      )}
    </div>
  );
};

export default ApiIntegrationExample; 