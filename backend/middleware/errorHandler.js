const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with more details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  } else {
    console.error('Error:', err.message);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with ID: ${err.value}`;
    error = { message, statusCode: 404, code: 'RESOURCE_NOT_FOUND' };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    error = { message, statusCode: 400, code: 'DUPLICATE_FIELD' };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const validationErrors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    error = { 
      message: 'Validation failed', 
      statusCode: 400, 
      code: 'VALIDATION_ERROR',
      details: validationErrors
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401, code: 'INVALID_TOKEN' };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401, code: 'TOKEN_EXPIRED' };
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError') {
    const message = 'Database connection error';
    error = { message, statusCode: 503, code: 'DATABASE_ERROR' };
  }

  // Request timeout
  if (err.code === 'ECONNABORTED') {
    const message = 'Request timeout';
    error = { message, statusCode: 408, code: 'REQUEST_TIMEOUT' };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size too large';
    error = { message, statusCode: 413, code: 'FILE_TOO_LARGE' };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' };
  }

  // Payment errors
  if (err.code && err.code.startsWith('PAYMENT_')) {
    error = { 
      message: err.message || 'Payment processing error', 
      statusCode: 402, 
      code: err.code 
    };
  }

  // Inventory errors
  if (err.code === 'INSUFFICIENT_STOCK') {
    error = { 
      message: err.message || 'Insufficient stock available', 
      statusCode: 409, 
      code: 'INSUFFICIENT_STOCK',
      details: err.details
    };
  }

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      message: error.message || 'Server Error',
      code: error.code || 'INTERNAL_ERROR'
    }
  };

  // Add details for validation errors
  if (error.details) {
    errorResponse.error.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(error.statusCode || 500).json(errorResponse);
};

// Custom error class for application-specific errors
class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, AppError, asyncHandler };