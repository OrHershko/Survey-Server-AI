import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing state that persists to localStorage
 * @param {string} key - The localStorage key
 * @param {any} initialValue - Initial value if no stored value exists
 * @returns {Array} [value, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // State to store our value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Function to remove the value from localStorage and reset to initial value
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * Custom hook for managing session storage (similar to localStorage but session-scoped)
 * @param {string} key - The sessionStorage key
 * @param {any} initialValue - Initial value if no stored value exists
 * @returns {Array} [value, setValue, removeValue]
 */
export const useSessionStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * Custom hook for managing temporary state with automatic cleanup
 * @param {any} initialValue - Initial value
 * @param {number} timeout - Time in milliseconds before auto-reset (default: 5000)
 * @returns {Array} [value, setValue, resetValue]
 */
export const useTemporaryState = (initialValue, timeout = 5000) => {
  const [value, setValue] = useState(initialValue);
  const [timeoutId, setTimeoutId] = useState(null);

  const setTemporaryValue = useCallback((newValue) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setValue(newValue);

    // Set new timeout to reset value
    const newTimeoutId = setTimeout(() => {
      setValue(initialValue);
      setTimeoutId(null);
    }, timeout);

    setTimeoutId(newTimeoutId);
  }, [initialValue, timeout, timeoutId]);

  const resetValue = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setValue(initialValue);
  }, [initialValue, timeoutId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return [value, setTemporaryValue, resetValue];
};

/**
 * Custom hook for managing state with history (undo/redo functionality)
 * @param {any} initialValue - Initial value
 * @param {number} maxHistory - Maximum number of history items to keep
 * @returns {Object} State management object with history
 */
export const useStateWithHistory = (initialValue, maxHistory = 10) => {
  const [history, setHistory] = useState([initialValue]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentValue = history[currentIndex];

  const setValue = useCallback((newValue) => {
    const valueToAdd = typeof newValue === 'function' ? newValue(currentValue) : newValue;
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, currentIndex + 1);
    
    // Add new value
    newHistory.push(valueToAdd);
    
    // Limit history size
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
    
    setHistory(newHistory);
  }, [currentValue, history, currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const resetHistory = useCallback(() => {
    setHistory([initialValue]);
    setCurrentIndex(0);
  }, [initialValue]);

  return {
    value: currentValue,
    setValue,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    history: history.slice(), // Return a copy to prevent external mutations
    currentIndex
  };
}; 