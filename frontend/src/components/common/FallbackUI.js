import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Skeleton
} from '@mui/material';
import {
  ErrorOutline,
  Refresh,
  WifiOff,
  CloudOff
} from '@mui/icons-material';

// Loading fallback component
export const LoadingFallback = ({ message = 'Loading...', size = 'medium' }) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        minHeight: size === 'large' ? '50vh' : 'auto'
      }}
    >
      <CircularProgress size={sizeMap[size]} sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

// Error fallback component
export const ErrorFallback = ({ 
  error, 
  onRetry, 
  message = 'Something went wrong',
  showRetry = true,
  variant = 'default'
}) => {
  const getIcon = () => {
    if (error?.code === 'NETWORK_ERROR') return <WifiOff sx={{ fontSize: 48 }} />;
    if (error?.code === 'SERVER_ERROR') return <CloudOff sx={{ fontSize: 48 }} />;
    return <ErrorOutline sx={{ fontSize: 48 }} />;
  };

  const getMessage = () => {
    if (error?.code === 'NETWORK_ERROR') return 'Network connection error';
    if (error?.code === 'SERVER_ERROR') return 'Server temporarily unavailable';
    return message;
  };

  if (variant === 'inline') {
    return (
      <Alert 
        severity="error" 
        action={
          showRetry && onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        {getMessage()}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        textAlign: 'center'
      }}
    >
      <Box sx={{ color: 'error.main', mb: 2 }}>
        {getIcon()}
      </Box>
      <Typography variant="h6" gutterBottom>
        {getMessage()}
      </Typography>
      {error?.message && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {error.message}
        </Typography>
      )}
      {showRetry && onRetry && (
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </Box>
  );
};

// Empty state fallback component
export const EmptyStateFallback = ({ 
  message = 'No data available',
  description,
  action,
  icon
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        textAlign: 'center'
      }}
    >
      {icon && (
        <Box sx={{ color: 'text.secondary', mb: 2, fontSize: 64 }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {message}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
};

// Skeleton loader for product cards
export const ProductCardSkeleton = () => {
  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
      <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" height={20} width="60%" sx={{ mb: 1 }} />
      <Skeleton variant="text" height={28} width="40%" />
    </Paper>
  );
};

// Skeleton loader for product grid
export const ProductGridSkeleton = ({ count = 8 }) => {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 2 }}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </Box>
  );
};

// Skeleton loader for product detail
export const ProductDetailSkeleton = () => {
  return (
    <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="rectangular" height={400} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" width={80} height={80} />
          ))}
        </Box>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="text" height={32} width="40%" sx={{ mb: 2 }} />
        <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" height={24} width="80%" sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={48} width="60%" sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={48} width="100%" />
      </Box>
    </Box>
  );
};

// Network status indicator
export const NetworkStatusIndicator = ({ isOnline }) => {
  if (isOnline) return null;

  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WifiOff />
        You're currently offline. Some features may not be available.
      </Box>
    </Alert>
  );
};

// Retry wrapper component
export const RetryWrapper = ({ 
  children, 
  onRetry, 
  error, 
  loading, 
  fallback,
  loadingFallback 
}) => {
  if (loading) {
    return loadingFallback || <LoadingFallback />;
  }

  if (error) {
    return fallback || <ErrorFallback error={error} onRetry={onRetry} />;
  }

  return children;
};

export default {
  LoadingFallback,
  ErrorFallback,
  EmptyStateFallback,
  ProductCardSkeleton,
  ProductGridSkeleton,
  ProductDetailSkeleton,
  NetworkStatusIndicator,
  RetryWrapper
};