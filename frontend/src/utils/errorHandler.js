// Error categorization and handling utilities

export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  CART_ERROR: 'CART_ERROR',
  PRODUCT_ERROR: 'PRODUCT_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

export const ErrorCodes = {
  // Network errors
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
  
  // Authentication errors
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_FAILED: 'REFRESH_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Cart specific errors
  PRODUCT_UNAVAILABLE: 'PRODUCT_UNAVAILABLE',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PRICE_CHANGED: 'PRICE_CHANGED',
  CART_SYNC_FAILED: 'CART_SYNC_FAILED',
  MIGRATION_FAILED: 'MIGRATION_FAILED',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

export const ErrorStrategies = {
  RETRY_WITH_BACKOFF: 'RETRY_WITH_BACKOFF',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  REDIRECT_LOGIN: 'REDIRECT_LOGIN',
  FALLBACK_GUEST: 'FALLBACK_GUEST',
  OFFLINE_MODE: 'OFFLINE_MODE',
  QUEUE_OPERATIONS: 'QUEUE_OPERATIONS',
  REMOVE_ITEM: 'REMOVE_ITEM',
  ADJUST_QUANTITY: 'ADJUST_QUANTITY',
  UPDATE_PRICE: 'UPDATE_PRICE',
  SHOW_ERROR: 'SHOW_ERROR',
  SILENT_FAIL: 'SILENT_FAIL'
};

// Error handling configuration
export const ErrorHandlingConfig = {
  [ErrorCodes.CONNECTION_TIMEOUT]: {
    type: ErrorTypes.NETWORK_ERROR,
    strategy: ErrorStrategies.RETRY_WITH_BACKOFF,
    userMessage: 'Connection slow. Retrying...',
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    baseDelay: 1000
  },
  
  [ErrorCodes.NETWORK_UNAVAILABLE]: {
    type: ErrorTypes.NETWORK_ERROR,
    strategy: ErrorStrategies.OFFLINE_MODE,
    userMessage: 'Working offline. Changes will sync when connection returns.',
    retryable: true,
    maxRetries: 0
  },
  
  [ErrorCodes.SERVER_UNAVAILABLE]: {
    type: ErrorTypes.NETWORK_ERROR,
    strategy: ErrorStrategies.QUEUE_OPERATIONS,
    userMessage: 'Server temporarily unavailable. Your changes are saved locally.',
    retryable: true,
    maxRetries: 5,
    baseDelay: 2000
  },
  
  [ErrorCodes.TOKEN_EXPIRED]: {
    type: ErrorTypes.AUTH_ERROR,
    strategy: ErrorStrategies.REFRESH_TOKEN,
    userMessage: 'Session expired. Refreshing...',
    retryable: true,
    maxRetries: 1
  },
  
  [ErrorCodes.TOKEN_INVALID]: {
    type: ErrorTypes.AUTH_ERROR,
    strategy: ErrorStrategies.REDIRECT_LOGIN,
    userMessage: 'Please log in again to continue',
    retryable: false
  },
  
  [ErrorCodes.REFRESH_FAILED]: {
    type: ErrorTypes.AUTH_ERROR,
    strategy: ErrorStrategies.FALLBACK_GUEST,
    userMessage: 'Continuing as guest. Please log in to save your cart.',
    retryable: false
  },
  
  [ErrorCodes.UNAUTHORIZED]: {
    type: ErrorTypes.AUTH_ERROR,
    strategy: ErrorStrategies.REDIRECT_LOGIN,
    userMessage: 'Access denied. Please log in.',
    retryable: false
  },
  
  [ErrorCodes.PRODUCT_UNAVAILABLE]: {
    type: ErrorTypes.CART_ERROR,
    strategy: ErrorStrategies.REMOVE_ITEM,
    userMessage: 'This item is no longer available and has been removed from your cart.',
    retryable: false
  },
  
  [ErrorCodes.INSUFFICIENT_STOCK]: {
    type: ErrorTypes.CART_ERROR,
    strategy: ErrorStrategies.ADJUST_QUANTITY,
    userMessage: 'Only {availableStock} items available. Quantity adjusted.',
    retryable: false
  },
  
  [ErrorCodes.PRICE_CHANGED]: {
    type: ErrorTypes.CART_ERROR,
    strategy: ErrorStrategies.UPDATE_PRICE,
    userMessage: 'Price updated to current amount: ₹{newPrice}',
    retryable: false
  },
  
  [ErrorCodes.CART_SYNC_FAILED]: {
    type: ErrorTypes.CART_ERROR,
    strategy: ErrorStrategies.RETRY_WITH_BACKOFF,
    userMessage: 'Cart sync failed. Retrying...',
    retryable: true,
    maxRetries: 3,
    baseDelay: 1000
  },
  
  [ErrorCodes.MIGRATION_FAILED]: {
    type: ErrorTypes.CART_ERROR,
    strategy: ErrorStrategies.FALLBACK_GUEST,
    userMessage: 'Cart migration failed. Items saved locally.',
    retryable: true,
    maxRetries: 2
  },
  
  [ErrorCodes.INVALID_INPUT]: {
    type: ErrorTypes.VALIDATION_ERROR,
    strategy: ErrorStrategies.SHOW_ERROR,
    userMessage: 'Please check your input and try again.',
    retryable: false
  },
  
  [ErrorCodes.INTERNAL_SERVER_ERROR]: {
    type: ErrorTypes.SERVER_ERROR,
    strategy: ErrorStrategies.RETRY_WITH_BACKOFF,
    userMessage: 'Server error. Please try again.',
    retryable: true,
    maxRetries: 2,
    baseDelay: 2000
  }
};

// Error categorization function
export const categorizeError = (error) => {
  // Network errors
  if (!error.response && error.request) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return ErrorCodes.CONNECTION_TIMEOUT;
    }
    return ErrorCodes.NETWORK_UNAVAILABLE;
  }
  
  // HTTP status based categorization
  const status = error.response?.status;
  const errorData = error.response?.data?.error || {};
  const errorCode = errorData.code;
  
  // Use backend error code if available
  if (errorCode && ErrorHandlingConfig[errorCode]) {
    return errorCode;
  }
  
  // Fallback to status-based categorization
  switch (status) {
    case 401:
      return ErrorCodes.TOKEN_EXPIRED;
    case 403:
      return ErrorCodes.UNAUTHORIZED;
    case 404:
      return ErrorCodes.PRODUCT_UNAVAILABLE;
    case 409:
      return ErrorCodes.INSUFFICIENT_STOCK;
    case 422:
      return ErrorCodes.INVALID_INPUT;
    case 500:
      return ErrorCodes.INTERNAL_SERVER_ERROR;
    case 502:
    case 503:
    case 504:
      return ErrorCodes.SERVER_UNAVAILABLE;
    default:
      return ErrorCodes.UNKNOWN_ERROR;
  }
};

// Get error handling configuration
export const getErrorConfig = (errorCode) => {
  return ErrorHandlingConfig[errorCode] || {
    type: ErrorTypes.UNKNOWN_ERROR,
    strategy: ErrorStrategies.SHOW_ERROR,
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: false
  };
};

// Format user message with dynamic values
export const formatErrorMessage = (template, values = {}) => {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
};

// Create standardized error object
export const createErrorObject = (error, context = {}) => {
  const errorCode = categorizeError(error);
  const config = getErrorConfig(errorCode);
  
  return {
    code: errorCode,
    type: config.type,
    strategy: config.strategy,
    message: formatErrorMessage(config.userMessage, context),
    originalError: error,
    retryable: config.retryable,
    maxRetries: config.maxRetries || 0,
    baseDelay: config.baseDelay || 1000,
    backoffMultiplier: config.backoffMultiplier || 2,
    timestamp: new Date().toISOString(),
    context
  };
};

// Check if error is retryable
export const isRetryableError = (errorCode) => {
  const config = getErrorConfig(errorCode);
  return config.retryable;
};

// Get retry configuration
export const getRetryConfig = (errorCode) => {
  const config = getErrorConfig(errorCode);
  return {
    maxRetries: config.maxRetries || 0,
    baseDelay: config.baseDelay || 1000,
    backoffMultiplier: config.backoffMultiplier || 2
  };
};

// Log error for debugging
export const logError = (error, context = {}) => {
  const errorObj = createErrorObject(error, context);
  
  console.group(`🚨 ${errorObj.type}: ${errorObj.code}`);
  console.error('Message:', errorObj.message);
  console.error('Strategy:', errorObj.strategy);
  console.error('Retryable:', errorObj.retryable);
  console.error('Context:', errorObj.context);
  console.error('Original Error:', errorObj.originalError);
  console.groupEnd();
  
  return errorObj;
};