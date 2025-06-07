import { useState } from 'react';

/**
 * Custom hook for managing form state with validation
 * @param {Object} initialValues - Initial form values
 * @param {Function} validationFn - Function to validate form values
 * @returns {Object} Form state and handlers
 */
export const useForm = (initialValues = {}, validationFn = () => ({})) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate this field on blur
    const fieldErrors = validationFn({ ...values });
    if (fieldErrors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: fieldErrors[name]
      }));
    }
  };

  const validateForm = () => {
    const formErrors = validationFn(values);
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  };

  const handleSubmit = async (submitFn) => {
    setIsSubmitting(true);
    
    const isValid = validateForm();
    if (!isValid) {
      setIsSubmitting(false);
      return;
    }

    try {
      await submitFn(values);
      resetForm();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    validateForm,
    setErrors,
    setIsSubmitting
  };
};

/**
 * Common validation functions
 */
export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return '';
  },

  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  },

  minLength: (min) => (value) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return '';
  },

  maxLength: (max) => (value) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return '';
  },

  password: (value) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters long';
    return '';
  }
};

/**
 * Helper function to combine multiple validators
 * @param {Array} validatorFns - Array of validator functions
 * @returns {Function} Combined validator function
 */
export const combineValidators = (...validatorFns) => (value) => {
  for (const validator of validatorFns) {
    const error = validator(value);
    if (error) return error;
  }
  return '';
};

/**
 * Helper function to create field-specific validation
 * @param {Object} fieldValidators - Object with field names as keys and validators as values
 * @returns {Function} Form validation function
 */
export const createFormValidator = (fieldValidators) => (values) => {
  const errors = {};
  
  Object.keys(fieldValidators).forEach(fieldName => {
    const validator = fieldValidators[fieldName];
    const value = values[fieldName];
    const error = typeof validator === 'function' 
      ? validator(value) 
      : combineValidators(...validator)(value);
    
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
}; 