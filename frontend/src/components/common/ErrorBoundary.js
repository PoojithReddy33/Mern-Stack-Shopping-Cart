import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Container
} from '@mui/material';
import { ErrorOutline, Refresh, Home } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // In a real app, you would send this to an error reporting service
    // like Sentry, LogRocket, or Bugsnag
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') || 'anonymous'
    };

    console.log('Error report:', errorReport);
    // Example: sendToErrorService(errorReport);
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, errorInfo, errorId, onRetry, showDetails }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: 'center',
          borderTop: 4,
          borderColor: 'error.main'
        }}
      >
        <Box sx={{ mb: 3 }}>
          <ErrorOutline
            sx={{
              fontSize: 64,
              color: 'error.main',
              mb: 2
            }}
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Oops! Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We're sorry, but something unexpected happened. Our team has been notified.
          </Typography>
        </Box>

        {showDetails && error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="subtitle2" gutterBottom>
              Error Details (Development Mode):
            </Typography>
            <Typography variant="body2" component="pre" sx={{ 
              fontSize: '0.75rem',
              overflow: 'auto',
              maxHeight: 200
            }}>
              {error.message}
              {error.stack && `\n\nStack Trace:\n${error.stack}`}
            </Typography>
            {errorInfo && (
              <Typography variant="body2" component="pre" sx={{ 
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: 200,
                mt: 1
              }}>
                Component Stack:{errorInfo.componentStack}
              </Typography>
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={onRetry}
            size="large"
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={handleGoHome}
            size="large"
          >
            Go Home
          </Button>
          <Button
            variant="outlined"
            onClick={handleReload}
            size="large"
          >
            Reload Page
          </Button>
        </Box>

        {errorId && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            Error ID: {errorId}
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default ErrorBoundary;