import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Divider
} from '@mui/material';
import { Error, NetworkCheck, BugReport } from '@mui/icons-material';
import useErrorHandler from '../../hooks/useErrorHandler';
import { validateEmail, validatePassword } from '../../utils/validation';
import FormField from './FormField';

// Demo component to test error handling functionality
const ErrorHandlingDemo = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { 
    errors, 
    globalError, 
    handleApiError, 
    handleValidationErrors, 
    clearErrors,
    hasFieldError,
    getFieldError
  } = useErrorHandler();

  // Simulate different types of errors
  const simulateValidationError = () => {
    const validationResult = {
      isValid: false,
      errors: {
        email: 'Invalid email format',
        password: 'Password too weak'
      }
    };
    handleValidationErrors(validationResult);
  };

  const simulateApiError = (errorType) => {
    let mockError;
    
    switch (errorType) {
      case 'validation':
        mockError = {
          response: {
            status: 400,
            data: {
              error: {
                message: 'Validation failed',
                details: [
                  { field: 'email', message: 'Email is required' },
                  { field: 'password', message: 'Password must be at least 6 characters' }
                ]
              }
            }
          }
        };
        break;
      case 'auth':
        mockError = {
          response: {
            status: 401,
            data: {
              error: {
                message: 'Authentication required',
                code: 'TOKEN_EXPIRED'
              }
            }
          }
        };
        break;
      case 'server':
        mockError = {
          response: {
            status: 500,
            data: {
              error: {
                message: 'Internal server error'
              }
            }
          }
        };
        break;
      case 'network':
        mockError = {
          request: {},
          message: 'Network Error'
        };
        break;
      default:
        mockError = new Error('Unknown error');
    }
    
    handleApiError(mockError, { showToast: false });
  };

  const simulateErrorBoundary = () => {
    // This will trigger the error boundary
    throw new Error('Simulated component error for testing ErrorBoundary');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Error Handling Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This component demonstrates the comprehensive error handling system.
      </Typography>

      {/* Global Error Display */}
      {globalError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Global Error:</Typography>
          {globalError}
        </Alert>
      )}

      {/* Field Errors Display */}
      {Object.keys(errors).length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Field Errors:</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{field}: {error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Form Fields Demo */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Form Validation Demo
        </Typography>
        
        <FormField
          name="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={hasFieldError('email')}
          helperText={getFieldError('email')}
          validator={validateEmail}
          validateOnChange={true}
          showValidationIcon={true}
          tooltip="Enter a valid email address"
          fullWidth
        />
        
        <FormField
          name="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={hasFieldError('password')}
          helperText={getFieldError('password')}
          validator={validatePassword}
          validateOnBlur={true}
          showValidationIcon={true}
          tooltip="Password must be at least 6 characters with uppercase, lowercase, and number"
          fullWidth
        />
      </Paper>

      {/* Error Simulation Buttons */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Error Simulation
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            onClick={simulateValidationError}
            startIcon={<Error />}
          >
            Validation Error
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => simulateApiError('validation')}
            startIcon={<Error />}
          >
            API Validation Error
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => simulateApiError('auth')}
            startIcon={<Error />}
          >
            Auth Error
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => simulateApiError('server')}
            startIcon={<Error />}
          >
            Server Error
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => simulateApiError('network')}
            startIcon={<NetworkCheck />}
          >
            Network Error
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={simulateErrorBoundary}
            startIcon={<BugReport />}
          >
            Trigger Error Boundary
          </Button>
          
          <Button
            variant="outlined"
            onClick={clearErrors}
          >
            Clear All Errors
          </Button>
        </Box>
      </Paper>

      {/* Instructions */}
      <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Instructions
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>Try typing invalid email/password in the form fields above</li>
            <li>Click the error simulation buttons to see different error types</li>
            <li>The "Trigger Error Boundary" button will crash this component to test the ErrorBoundary</li>
            <li>Check the browser console for detailed error logs</li>
            <li>Toast notifications are disabled in this demo to avoid spam</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
};

export default ErrorHandlingDemo;