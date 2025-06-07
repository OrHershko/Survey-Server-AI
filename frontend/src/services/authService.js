import api from './api';

export const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email address
   * @param {string} userData.password - Password
   * @param {string} userData.registrationCode - Registration code
   * @returns {Promise<Object>} Registration response
   */
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Registration failed. Please try again.');
    }
  },

  /**
   * Login user and get token
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - Email address
   * @param {string} credentials.password - Password
   * @returns {Promise<Object>} Login response with token and user data
   */
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      
      // Store token and user data in localStorage
      if (response.data.accessToken) {
        localStorage.setItem('authToken', response.data.accessToken);
        if (response.data.user) {
          localStorage.setItem('userData', JSON.stringify(response.data.user));
        }
      }
      
      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  /**
   * Logout user and clear stored data
   */
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    // The api interceptor will handle removing the Authorization header
  },

  /**
   * Get current user data from localStorage
   * @returns {Object|null} User data or null if not logged in
   */
  getCurrentUser() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Get current auth token
   * @returns {string|null} Auth token or null if not logged in
   */
  getToken() {
    return localStorage.getItem('authToken');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user has valid token
   */
  isAuthenticated() {
    return !!this.getToken();
  }
};

export default authService; 