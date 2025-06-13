/**
 * Notification utility for providing user feedback
 * This can be integrated with toast libraries like react-toastify or custom notification systems
 */

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
};

// Default notification configuration
const DEFAULT_CONFIG = {
  duration: 5000, // 5 seconds
  position: 'top-right',
  dismissible: true,
  showProgress: true
};

// In-memory notification store (can be replaced with context or state management)
let notifications = [];
let notificationId = 0;
let listeners = [];

/**
 * Add a notification listener
 * @param {Function} listener - Function to call when notifications change
 */
export const addNotificationListener = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

/**
 * Notify all listeners of notification changes
 */
const notifyListeners = () => {
  listeners.forEach(listener => listener(notifications));
};

/**
 * Create a new notification
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} config - Additional configuration
 * @returns {Object} Notification object
 */
export const createNotification = (type, title, message, config = {}) => {
  const notification = {
    id: ++notificationId,
    type,
    title,
    message,
    timestamp: new Date(),
    ...DEFAULT_CONFIG,
    ...config
  };

  notifications.push(notification);
  notifyListeners();

  // Auto-dismiss if duration is set
  if (notification.duration > 0) {
    setTimeout(() => {
      dismissNotification(notification.id);
    }, notification.duration);
  }

  return notification;
};

/**
 * Dismiss a notification by ID
 * @param {number} id - Notification ID
 */
export const dismissNotification = (id) => {
  notifications = notifications.filter(n => n.id !== id);
  notifyListeners();
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = () => {
  notifications = [];
  notifyListeners();
};

/**
 * Get all current notifications
 * @returns {Array} Array of notifications
 */
export const getNotifications = () => notifications;

/**
 * Notification helper functions for common scenarios
 */
export const notify = {
  /**
   * Show success notification
   * @param {string} title - Success title
   * @param {string} message - Success message
   * @param {Object} config - Additional configuration
   */
  success: (title, message, config = {}) => 
    createNotification(NOTIFICATION_TYPES.SUCCESS, title, message, config),

  /**
   * Show error notification
   * @param {string} title - Error title
   * @param {string} message - Error message
   * @param {Object} config - Additional configuration
   */
  error: (title, message, config = {}) => 
    createNotification(NOTIFICATION_TYPES.ERROR, title, message, {
      duration: 8000, // Longer duration for errors
      ...config
    }),

  /**
   * Show warning notification
   * @param {string} title - Warning title
   * @param {string} message - Warning message
   * @param {Object} config - Additional configuration
   */
  warning: (title, message, config = {}) => 
    createNotification(NOTIFICATION_TYPES.WARNING, title, message, config),

  /**
   * Show info notification
   * @param {string} title - Info title
   * @param {string} message - Info message
   * @param {Object} config - Additional configuration
   */
  info: (title, message, config = {}) => 
    createNotification(NOTIFICATION_TYPES.INFO, title, message, config),

  /**
   * Show loading notification
   * @param {string} title - Loading title
   * @param {string} message - Loading message
   * @param {Object} config - Additional configuration
   */
  loading: (title, message, config = {}) => 
    createNotification(NOTIFICATION_TYPES.LOADING, title, message, {
      duration: 0, // Don't auto-dismiss loading notifications
      dismissible: false,
      ...config
    })
};

/**
 * API operation notification helpers
 */
export const apiNotifications = {
  /**
   * Show notifications for survey operations
   */
  survey: {
    created: () => notify.success('Survey Created', 'Your survey has been created successfully'),
    updated: () => notify.success('Survey Updated', 'Your survey has been updated successfully'),
    deleted: () => notify.success('Survey Deleted', 'Survey has been deleted successfully'),
    closed: () => notify.success('Survey Closed', 'Survey has been closed successfully'),
    responseSubmitted: () => notify.success('Response Submitted', 'Your response has been submitted successfully'),
    responseUpdated: () => notify.success('Response Updated', 'Your response has been updated successfully'),
    responseDeleted: () => notify.success('Response Deleted', 'Response has been deleted successfully'),
    createError: (error) => notify.error('Failed to Create Survey', error),
    updateError: (error) => notify.error('Failed to Update Survey', error),
    deleteError: (error) => notify.error('Failed to Delete Survey', error),
    responseError: (error) => notify.error('Failed to Submit Response', error)
  },

  /**
   * Show notifications for AI operations
   */
  ai: {
    summaryGenerated: () => notify.success('Summary Generated', 'AI summary has been generated successfully'),
    summaryGenerating: () => notify.loading('Generating Summary', 'AI is analyzing responses...'),
    searchCompleted: (count) => notify.success('Search Completed', `Found ${count} relevant surveys`),
    searchError: (error) => notify.error('Search Failed', error),
    validationCompleted: (issues) => notify.info('Validation Completed', 
      issues > 0 ? `Found ${issues} potential issues` : 'All responses look good'),
    validationError: (error) => notify.error('Validation Failed', error),
    summaryError: (error) => notify.error('Failed to Generate Summary', error)
  },

  /**
   * Show notifications for authentication operations
   */
  auth: {
    loginSuccess: (username) => notify.success('Welcome Back', `Hello ${username}!`),
    loginError: (error) => notify.error('Login Failed', error),
    registerSuccess: () => notify.success('Registration Successful', 'You can now log in with your credentials'),
    registerError: (error) => notify.error('Registration Failed', error),
    logoutSuccess: () => notify.info('Logged Out', 'You have been logged out successfully'),
    sessionExpired: () => notify.warning('Session Expired', 'Please log in again to continue')
  },

  /**
   * Show notifications for general API operations
   */
  general: {
    networkError: () => notify.error('Network Error', 'Please check your internet connection and try again'),
    serverError: () => notify.error('Server Error', 'Something went wrong on our end. Please try again later'),
    unauthorized: () => notify.error('Unauthorized', 'You are not authorized to perform this action'),
    notFound: () => notify.error('Not Found', 'The requested resource was not found'),
    validationError: (error) => notify.error('Validation Error', error),
    unknownError: () => notify.error('Unknown Error', 'An unexpected error occurred. Please try again')
  }
};

/**
 * Handle API errors and show appropriate notifications
 * @param {Error} error - Error object from API call
 * @param {string} operation - Description of the operation that failed
 */
export const handleApiError = (error, operation = 'Operation') => {
  console.error(`${operation} failed:`, error);

  if (!error.response) {
    // Network error
    apiNotifications.general.networkError();
    return;
  }

  const status = error.response.status;
  const message = error.response.data?.message || error.message;

  switch (status) {
    case 400:
      apiNotifications.general.validationError(message);
      break;
    case 401:
      apiNotifications.general.unauthorized();
      break;
    case 403:
      notify.error('Access Denied', 'You do not have permission to perform this action');
      break;
    case 404:
      apiNotifications.general.notFound();
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      apiNotifications.general.serverError();
      break;
    default:
      notify.error(`${operation} Failed`, message || 'An unexpected error occurred');
  }
};

/**
 * Wrap an async function with automatic error notification
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} operation - Description of the operation
 * @returns {Function} Wrapped function
 */
export const withErrorNotification = (asyncFn, operation) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      handleApiError(error, operation);
      throw error;
    }
  };
};

const notificationUtils = {
  NOTIFICATION_TYPES,
  createNotification,
  dismissNotification,
  clearAllNotifications,
  getNotifications,
  addNotificationListener,
  notify,
  apiNotifications,
  handleApiError,
  withErrorNotification
};

export default notificationUtils; 