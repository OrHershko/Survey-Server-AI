import { useState, useCallback } from 'react';
import { surveyService } from '../services';

export const useSurveys = () => {
  const [surveys, setSurveys] = useState([]);
  const [currentSurvey, setCurrentSurvey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchSurveys = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyService.getSurveys(params);
      setSurveys(response.surveys || response.data || []);
      
      if (response.pagination) {
        setPagination(response.pagination);
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSurveyById = useCallback(async (surveyId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyService.getSurveyById(surveyId);
      setCurrentSurvey(response.survey || response);
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSurvey = useCallback(async (surveyData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyService.createSurvey(surveyData);
      
      // Add new survey to the list if it exists
      if (response.survey || response) {
        setSurveys(prev => [response.survey || response, ...prev]);
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSurveyExpiry = useCallback(async (surveyId, expiryDate) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyService.updateSurveyExpiry(surveyId, expiryDate);
      
      // Update the survey in current list and current survey
      const updatedSurvey = response.survey || response;
      setSurveys(prev => prev.map(survey => 
        survey._id === surveyId ? updatedSurvey : survey
      ));
      
      if (currentSurvey?._id === surveyId) {
        setCurrentSurvey(updatedSurvey);
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSurvey]);

  const closeSurvey = useCallback(async (surveyId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyService.closeSurvey(surveyId);
      
      // Update the survey in current list and current survey
      const updatedSurvey = response.survey || response;
      setSurveys(prev => prev.map(survey => 
        survey._id === surveyId ? updatedSurvey : survey
      ));
      
      if (currentSurvey?._id === surveyId) {
        setCurrentSurvey(updatedSurvey);
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSurvey]);

  const submitResponse = useCallback(async (surveyId, responseData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyService.submitResponse(surveyId, responseData);
      
      // Update current survey with new response if available
      if (currentSurvey?._id === surveyId && response.response) {
        setCurrentSurvey(prev => ({
          ...prev,
          responses: [...(prev.responses || []), response.response]
        }));
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSurvey]);

  const updateResponse = useCallback(async (surveyId, responseId, responseData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyService.updateResponse(surveyId, responseId, responseData);
      
      // Update current survey with updated response if available
      if (currentSurvey?._id === surveyId && response.response) {
        setCurrentSurvey(prev => ({
          ...prev,
          responses: prev.responses?.map(r => 
            r._id === responseId ? response.response : r
          ) || []
        }));
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSurvey]);

  const deleteResponse = useCallback(async (surveyId, responseId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyService.deleteResponse(surveyId, responseId);
      
      // Remove response from current survey if available
      if (currentSurvey?._id === surveyId) {
        setCurrentSurvey(prev => ({
          ...prev,
          responses: prev.responses?.filter(r => r._id !== responseId) || []
        }));
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSurvey]);

  // Reset state
  const resetState = useCallback(() => {
    setSurveys([]);
    setCurrentSurvey(null);
    setError(null);
    setPagination({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    });
  }, []);

  return {
    // State
    surveys,
    currentSurvey,
    loading,
    error,
    pagination,
    
    // Actions
    fetchSurveys,
    fetchSurveyById,
    createSurvey,
    updateSurveyExpiry,
    closeSurvey,
    submitResponse,
    updateResponse,
    deleteResponse,
    clearError,
    resetState,
    
    // Setters for direct state updates if needed
    setSurveys,
    setCurrentSurvey
  };
};

export default useSurveys; 