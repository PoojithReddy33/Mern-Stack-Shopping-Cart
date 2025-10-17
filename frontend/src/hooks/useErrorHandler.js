import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useErrorHandler = () => {
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  // Handle API errors
  const handleApiError = useCallback((error, options = {}) => {
    const {
      showToast = true,
      fieldMapping = {},
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    console.error('API Error:', error);

    // Clear previous errors
    setErrors({});
    setGlobalError(null);

    if (error.response) {
      const { status, data } = error.response;
      const errorData = data?.error || {};

      // Handle validation errors (400)
      if (status === 400 && errorData.details) {
        const fieldErrors = {};
        errorData.details.forEach(detail => {
          const fieldName = fieldMapping[detail.field] || detail.field;
          fieldErrors[fieldName] = detail.message;
        });
        setErrors(fieldErrors);
        
        if (showToast) {
          toast.error(errorData.message || 'Please check the form for errors');
        }
        return { type: 'validation', errors: fieldErrors };
      }

      // Handle authentication errors (401)
      if (status === 401) {
        const message = errorData.message || 'Authentication required';
        setGlobalError(message);
        
        if (showToast) {
          toast.error(message);
        }
        
        // Redirect to login if token expired
        if (errorData.code === 'TOKEN_EXPIRED') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        
        return { type: 'auth', message };
      }

      // Handle authorization errors (403)
      if (status === 403) {
        const message = errorData.message || 'Access denied';
        setGlobalError(message);
        
        if (showToast) {
          toast.error(message);
        }
        return { type: 'forbidden', message };
      }

      // Handle not found errors (404)
      if (status === 404) {
        const message = errorData.message || 'Resource not found';
        setGlobalError(message);
        
        if (showToast) {
          toast.error(message);
        }
        return { type: 'notFound', message };
      }

      // Handle conflict errors (409) - like insufficient stock
      if (status === 409) {
        const message = errorData.message || 'Conflict occurred';
        setGlobalError(message);
        
        if (showToast) {
          toast.error(message);
        }
        return { type: 'conflict', message, details: errorData.details };
      }

      // Handle server errors (500+)
      if (status >= 500) {
        const message = 'Server error. Please try again later.';
        setGlobalError(message);
        
        if (showToast) {
          toast.error(message);
        }
        return { type: 'server', message };
      }

      // Handle other HTTP errors
      const message = errorData.message || fallbackMessage;
      setGlobalError(message);
      
      if (showToast) {
        toast.error(message);
      }
      return { type: 'http', message, status };
    }

    // Handle network errors
    if (error.request) {
      const message = 'Network error. Please check your connection.';
      setGlobalError(message);
      
      if (showToast) {
        toast.error(message);
      }
      return { type: 'network', message };
    }

    // Handle other errors
    const message = error.message || fallbackMessage;
    setGlobalError(message);
    
    if (showToast) {
      toast.error(message);
    }
    return { type: 'unknown', message };
  }, []);

  // Handle form validation errors
  const handleValidationErrors = useCallback((validationResult) => {
    if (!validationResult.isValid) {
      setErrors(validationResult.errors);
      setGlobalError(null);
      return false;
    }
    setErrors({});
    setGlobalError(null);
    return true;
  }, []);

  // Set field error manually
  const setFieldError = useCallback((field, message) => {
    setErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  // Clear field error
  const clearFieldError = useCallback((field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
    setGlobalError(null);
  }, []);

  // Check if field has error
  const hasFieldError = useCallback((field) => {
    return !!errors[field];
  }, [errors]);

  // Get field error message
  const getFieldError = useCallback((field) => {
    return errors[field] || null;
  }, [errors]);

  // Check if there are any errors
  const hasErrors = useCallback(() => {
    return Object.keys(errors).length > 0 || !!globalError;
  }, [errors, globalError]);

  return {
    errors,
    globalError,
    handleApiError,
    handleValidationErrors,
    setFieldError,
    clearFieldError,
    clearErrors,
    hasFieldError,
    getFieldError,
    hasErrors
  };
};

export default useErrorHandler;