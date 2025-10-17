import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, options = {}) => {
    const { 
      showSuccessToast = false, 
      successMessage = 'Operation successful',
      showErrorToast = false, // Changed default to false since interceptor handles it
      suppressNotFoundToast = false,
      onSuccess,
      onError,
      onFinally
    } = options;

    setLoading(true);
    setError(null);

    try {
      // Add config to suppress 404 toasts if needed
      if (suppressNotFoundToast && typeof apiCall === 'function') {
        const originalCall = apiCall;
        apiCall = () => {
          const request = originalCall();
          if (request?.config) {
            request.config.suppressNotFoundToast = true;
          }
          return request;
        };
      }

      const response = await apiCall();
      
      if (showSuccessToast) {
        toast.success(successMessage);
      }
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      return response.data;
    } catch (err) {
      const errorData = err.response?.data?.error || {};
      const errorMessage = errorData.message || err.message || 'An error occurred';
      
      // Enhanced error object
      const enhancedError = {
        message: errorMessage,
        code: err.code || errorData.code,
        status: err.response?.status,
        details: err.details || errorData.details,
        originalError: err
      };
      
      setError(enhancedError);
      
      // Only show toast if explicitly requested (since interceptor handles most cases)
      if (showErrorToast) {
        toast.error(errorMessage);
      }
      
      if (onError) {
        onError(enhancedError);
      }
      
      throw enhancedError;
    } finally {
      setLoading(false);
      
      if (onFinally) {
        onFinally();
      }
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  // Retry function
  const retry = useCallback(async (lastApiCall, lastOptions) => {
    if (lastApiCall) {
      return execute(lastApiCall, lastOptions);
    }
  }, [execute]);

  return {
    loading,
    error,
    execute,
    reset,
    retry
  };
};

export default useApi;