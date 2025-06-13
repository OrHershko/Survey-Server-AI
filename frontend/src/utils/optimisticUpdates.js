/**
 * Utility functions for optimistic UI updates
 * These functions help provide immediate feedback to users while API calls are in progress
 */

/**
 * Create an optimistic update for a list operation
 * @param {Function} setter - State setter function
 * @param {Function} apiCall - API function to call
 * @param {Function} optimisticUpdate - Function that updates state optimistically
 * @param {Function} onError - Function to revert state on error (optional)
 * @returns {Function} Function that performs optimistic update
 */
export const createOptimisticUpdate = (setter, apiCall, optimisticUpdate, onError) => {
  return async (...args) => {
    // Store current state for potential rollback
    let previousState;
    
    try {
      // Apply optimistic update immediately
      setter(prev => {
        previousState = prev;
        return optimisticUpdate(prev, ...args);
      });
      
      // Perform actual API call
      const result = await apiCall(...args);
      
      // Optionally update with real data if different from optimistic
      return result;
    } catch (error) {
      // Revert to previous state on error
      if (onError) {
        setter(prev => onError(prev, previousState, error, ...args));
      } else {
        setter(previousState);
      }
      throw error;
    }
  };
};

/**
 * Optimistic update patterns for common operations
 */
export const optimisticPatterns = {
  /**
   * Add item to beginning of list
   * @param {Array} list - Current list
   * @param {Object} newItem - Item to add
   * @returns {Array} Updated list
   */
  addToList: (list, newItem) => [newItem, ...list],
  
  /**
   * Remove item from list by ID
   * @param {Array} list - Current list
   * @param {string} itemId - ID of item to remove
   * @returns {Array} Updated list
   */
  removeFromList: (list, itemId) => list.filter(item => item._id !== itemId),
  
  /**
   * Update item in list by ID
   * @param {Array} list - Current list
   * @param {string} itemId - ID of item to update
   * @param {Object} updates - Updates to apply
   * @returns {Array} Updated list
   */
  updateInList: (list, itemId, updates) => 
    list.map(item => item._id === itemId ? { ...item, ...updates } : item),
  
  /**
   * Toggle boolean property in list item
   * @param {Array} list - Current list
   * @param {string} itemId - ID of item to toggle
   * @param {string} property - Property to toggle
   * @returns {Array} Updated list
   */
  toggleInList: (list, itemId, property) => 
    list.map(item => 
      item._id === itemId ? { ...item, [property]: !item[property] } : item
    ),
  
  /**
   * Increment/decrement numeric property in list item
   * @param {Array} list - Current list
   * @param {string} itemId - ID of item to update
   * @param {string} property - Property to increment
   * @param {number} amount - Amount to increment (can be negative)
   * @returns {Array} Updated list
   */
  incrementInList: (list, itemId, property, amount = 1) => 
    list.map(item => 
      item._id === itemId ? { ...item, [property]: (item[property] || 0) + amount } : item
    )
};

/**
 * Create optimistic survey operations
 * @param {Function} setSurveys - Survey list setter
 * @param {Function} setCurrentSurvey - Current survey setter
 * @param {Object} services - API services
 * @returns {Object} Optimistic survey operations
 */
export const createOptimisticSurveyOps = (setSurveys, setCurrentSurvey, services) => {
  return {
    createSurvey: createOptimisticUpdate(
      setSurveys,
      services.surveyService.createSurvey,
      (surveys, surveyData) => [
        { ...surveyData, _id: `temp_${Date.now()}`, createdAt: new Date() },
        ...surveys
      ]
    ),
    
    deleteSurvey: createOptimisticUpdate(
      setSurveys,
      services.surveyService.deleteSurvey,
      (surveys, surveyId) => optimisticPatterns.removeFromList(surveys, surveyId)
    ),
    
    closeSurvey: createOptimisticUpdate(
      setSurveys,
      services.surveyService.closeSurvey,
      (surveys, surveyId) => optimisticPatterns.updateInList(surveys, surveyId, { 
        closed: true, 
        closedAt: new Date() 
      })
    ),
    
    submitResponse: createOptimisticUpdate(
      setCurrentSurvey,
      services.surveyService.submitResponse,
      (survey, surveyId, responseData) => ({
        ...survey,
        responses: [
          ...(survey.responses || []),
          {
            ...responseData,
            _id: `temp_${Date.now()}`,
            createdAt: new Date(),
            user: services.authService.getCurrentUser()?._id
          }
        ]
      })
    )
  };
};

/**
 * Debounce function for optimistic updates that might fire rapidly
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounceOptimistic = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for optimistic updates
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttleOptimistic = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export default {
  createOptimisticUpdate,
  optimisticPatterns,
  createOptimisticSurveyOps,
  debounceOptimistic,
  throttleOptimistic
}; 