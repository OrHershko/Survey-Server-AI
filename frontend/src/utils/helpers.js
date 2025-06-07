/**
 * Date and time utility functions
 */
export const dateHelpers = {
  /**
   * Format date to readable string
   * @param {string|Date} date - Date to format
   * @param {Object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date string
   */
  formatDate: (date, options = {}) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(dateObj);
  },

  /**
   * Format date and time to readable string
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date and time string
   */
  formatDateTime: (date) => {
    return dateHelpers.formatDate(date, {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Get relative time (e.g., "2 hours ago", "in 3 days")
   * @param {string|Date} date - Date to compare
   * @returns {string} Relative time string
   */
  getRelativeTime: (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((dateObj - now) / 1000);
    
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 }
    ];

    if (Math.abs(diffInSeconds) < 60) {
      return 'Just now';
    }

    for (const interval of intervals) {
      const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
      if (count >= 1) {
        const suffix = count === 1 ? '' : 's';
        return diffInSeconds > 0 
          ? `In ${count} ${interval.label}${suffix}`
          : `${count} ${interval.label}${suffix} ago`;
      }
    }

    return 'Just now';
  },

  /**
   * Check if date is in the past
   * @param {string|Date} date - Date to check
   * @returns {boolean} True if date is in the past
   */
  isPastDate: (date) => {
    if (!date) return false;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj < new Date();
  }
};

/**
 * String utility functions
 */
export const stringHelpers = {
  /**
   * Capitalize first letter of string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize: (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Truncate string to specified length
   * @param {string} str - String to truncate
   * @param {number} length - Maximum length
   * @param {string} suffix - Suffix to add (default: '...')
   * @returns {string} Truncated string
   */
  truncate: (str, length, suffix = '...') => {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  },

  /**
   * Convert string to URL-friendly slug
   * @param {string} str - String to convert
   * @returns {string} URL slug
   */
  slugify: (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  /**
   * Extract initials from name
   * @param {string} name - Full name
   * @returns {string} Initials
   */
  getInitials: (name) => {
    if (!name || typeof name !== 'string') return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }
};

/**
 * Array utility functions
 */
export const arrayHelpers = {
  /**
   * Group array of objects by property
   * @param {Array} array - Array to group
   * @param {string} key - Property to group by
   * @returns {Object} Grouped object
   */
  groupBy: (array, key) => {
    if (!Array.isArray(array)) return {};
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  /**
   * Sort array of objects by property
   * @param {Array} array - Array to sort
   * @param {string} key - Property to sort by
   * @param {string} order - 'asc' or 'desc'
   * @returns {Array} Sorted array
   */
  sortBy: (array, key, order = 'asc') => {
    if (!Array.isArray(array)) return [];
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  },

  /**
   * Remove duplicates from array
   * @param {Array} array - Array to deduplicate
   * @param {string} key - Property to check for uniqueness (optional)
   * @returns {Array} Array without duplicates
   */
  unique: (array, key = null) => {
    if (!Array.isArray(array)) return [];
    
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }
    
    return [...new Set(array)];
  }
};

/**
 * Local storage helper functions
 */
export const storageHelpers = {
  /**
   * Set item in localStorage with JSON serialization
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting localStorage item:', error);
    }
  },

  /**
   * Get item from localStorage with JSON parsing
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key not found
   * @returns {any} Parsed value or default
   */
  getItem: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error getting localStorage item:', error);
      return defaultValue;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing localStorage item:', error);
    }
  },

  /**
   * Clear all localStorage items
   */
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Throttle function for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Generate random ID
 * @param {number} length - Length of ID
 * @returns {string} Random ID
 */
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}; 