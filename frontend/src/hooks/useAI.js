import { useState, useCallback } from 'react';
import { aiService } from '../services';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [summary, setSummary] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generateSummary = useCallback(async (surveyId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await aiService.generateSurveySummary(surveyId);
      setSummary(response.summary || response);
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSummaryVisibility = useCallback(async (surveyId, isVisible) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await aiService.toggleSummaryVisibility(surveyId, isVisible);
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchSurveys = useCallback(async (query, limit) => {
    try {
      setLoading(true);
      setError(null);
      setSearchResults([]); // Clear previous results
      
      const response = await aiService.searchSurveysNLP({ query, limit });
      setSearchResults(response.results || response.surveys || []);
      
      return response;
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateResponses = useCallback(async (surveyId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await aiService.validateSurveyResponses(surveyId);
      setValidationResults(response.validation || response);
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear specific state
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  const clearValidationResults = useCallback(() => {
    setValidationResults(null);
  }, []);

  const clearSummary = useCallback(() => {
    setSummary(null);
  }, []);

  // Reset all AI state
  const resetState = useCallback(() => {
    setSearchResults([]);
    setValidationResults(null);
    setSummary(null);
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    searchResults,
    validationResults,
    summary,
    
    // Actions
    generateSummary,
    toggleSummaryVisibility,
    searchSurveys,
    validateResponses,
    
    // Clear functions
    clearError,
    clearSearchResults,
    clearValidationResults,
    clearSummary,
    resetState,
    
    // Setters for direct state updates if needed
    setSearchResults,
    setValidationResults,
    setSummary
  };
};

export default useAI; 