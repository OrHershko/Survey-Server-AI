import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 30000, // Increased timeout for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to create delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to determine if request should be retried
const shouldRetry = (error) => {
  // Retry on network errors or 5xx server errors
  return !error.response || (error.response.status >= 500 && error.response.status < 600);
};

// Request interceptor to add auth token and request ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add unique request ID for tracking
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add retry count to config
    config.retryCount = config.retryCount || 0;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic and error handling
api.interceptors.response.use(
  (response) => {
    // Transform response data if needed
    return response;
  },
  async (error) => {
    const config = error.config;
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      // Don't redirect if already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    
    // Implement retry logic
    if (shouldRetry(error) && config.retryCount < MAX_RETRIES) {
      config.retryCount += 1;
      
      // Exponential backoff: delay increases with each retry
      const retryDelay = RETRY_DELAY * Math.pow(2, config.retryCount - 1);
      
      console.warn(`Request failed, retrying (${config.retryCount}/${MAX_RETRIES}) after ${retryDelay}ms:`, {
        url: config.url,
        method: config.method,
        error: error.message
      });
      
      await delay(retryDelay);
      return api(config);
    }
    
    // Log non-retry errors for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: config?.url,
        method: config?.method,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        requestId: config?.headers?.['X-Request-ID']
      });
    }
    
    return Promise.reject(error);
  }
);

// Helper functions for common operations
export const apiHelpers = {
  /**
   * Handle file uploads with progress tracking
   * @param {string} url - Upload endpoint
   * @param {FormData} formData - File data
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} Upload promise
   */
  uploadFile: async (url, formData, onProgress) => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  /**
   * Download file with proper headers
   * @param {string} url - Download endpoint
   * @param {string} filename - File name for download
   * @returns {Promise} Download promise
   */
  downloadFile: async (url, filename) => {
    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    // Create download link
    const urlObject = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = urlObject;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlObject);
    
    return response;
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  /**
   * Get current user data
   * @returns {Object|null} User data or null
   */
  getCurrentUser: () => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }
};

export default api; 