import React from 'react';
import toast from 'react-hot-toast';
import { ErrorTypes, ErrorStrategies } from '../../utils/errorHandler';

// Error notification component with action buttons
export const ErrorNotification = ({ error, onRetry, onDismiss }) => {
  const getErrorIcon = (errorType) => {
    switch (errorType) {
      case ErrorTypes.NETWORK_ERROR:
        return '🌐';
      case ErrorTypes.AUTH_ERROR:
        return '🔐';
      case ErrorTypes.CART_ERROR:
        return '🛒';
      case ErrorTypes.VALIDATION_ERROR:
        return '⚠️';
      case ErrorTypes.SERVER_ERROR:
        return '🔧';
      default:
        return '❌';
    }
  };

  const getActionButton = (error) => {
    if (!error.retryable) return null;

    switch (error.strategy) {
      case ErrorStrategies.RETRY_WITH_BACKOFF:
        return (
          <button
            onClick={onRetry}
            className="ml-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        );
      
      case ErrorStrategies.REFRESH_TOKEN:
        return (
          <button
            onClick={onRetry}
            className="ml-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
          >
            Refresh
          </button>
        );
      
      case ErrorStrategies.REDIRECT_LOGIN:
        return (
          <button
            onClick={() => window.location.href = '/login'}
            className="ml-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
          >
            Login
          </button>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center">
        <span className="text-lg mr-2">{getErrorIcon(error.type)}</span>
        <div>
          <p className="text-red-800 font-medium">{error.message}</p>
          {error.code && (
            <p className="text-red-600 text-sm">Error Code: {error.code}</p>
          )}
        </div>
      </div>
      <div className="flex items-center">
        {getActionButton(error)}
        <button
          onClick={onDismiss}
          className="ml-2 text-red-500 hover:text-red-700 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Toast notification helpers
export const showErrorToast = (error, options = {}) => {
  const icon = (() => {
    switch (error.type) {
      case ErrorTypes.NETWORK_ERROR:
        return '🌐';
      case ErrorTypes.AUTH_ERROR:
        return '🔐';
      case ErrorTypes.CART_ERROR:
        return '🛒';
      case ErrorTypes.VALIDATION_ERROR:
        return '⚠️';
      case ErrorTypes.SERVER_ERROR:
        return '🔧';
      default:
        return '❌';
    }
  })();

  const toastOptions = {
    duration: error.retryable ? 6000 : 4000,
    icon,
    style: {
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      color: '#991B1B',
    },
    ...options
  };

  if (error.retryable && options.onRetry) {
    return toast.custom(
      (t) => (
        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg">
          <div className="flex items-center">
            <span className="text-lg mr-2">{icon}</span>
            <p className="text-red-800">{error.message}</p>
          </div>
          <div className="flex items-center ml-4">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                options.onRetry();
              }}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors mr-2"
            >
              Retry
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      ),
      toastOptions
    );
  }

  return toast.error(error.message, toastOptions);
};

// Success notification helpers
export const showSuccessToast = (message, options = {}) => {
  return toast.success(message, {
    icon: '✅',
    style: {
      background: '#F0FDF4',
      border: '1px solid #BBF7D0',
      color: '#166534',
    },
    ...options
  });
};

// Info notification helpers
export const showInfoToast = (message, options = {}) => {
  return toast(message, {
    icon: 'ℹ️',
    style: {
      background: '#EFF6FF',
      border: '1px solid #BFDBFE',
      color: '#1E40AF',
    },
    ...options
  });
};

// Warning notification helpers
export const showWarningToast = (message, options = {}) => {
  return toast(message, {
    icon: '⚠️',
    style: {
      background: '#FFFBEB',
      border: '1px solid #FED7AA',
      color: '#92400E',
    },
    ...options
  });
};

// Cart-specific error messages
export const CartErrorMessages = {
  ADD_FAILED: 'Failed to add item to cart. Please try again.',
  UPDATE_FAILED: 'Failed to update cart item. Please try again.',
  REMOVE_FAILED: 'Failed to remove item from cart. Please try again.',
  LOAD_FAILED: 'Failed to load your cart. Please refresh the page.',
  SYNC_FAILED: 'Cart sync failed. Your changes are saved locally.',
  MIGRATION_FAILED: 'Failed to migrate your cart. Items are saved locally.',
  NETWORK_ERROR: 'Network error. Working offline - changes will sync when connection returns.',
  AUTH_ERROR: 'Authentication error. Please log in again to save your cart.',
  STOCK_ERROR: 'Some items in your cart are no longer available.',
  PRICE_CHANGED: 'Prices have been updated for some items in your cart.'
};

// Show cart-specific error with appropriate actions
export const showCartError = (errorType, error, actions = {}) => {
  const message = CartErrorMessages[errorType] || error.message;
  
  const errorObj = {
    ...error,
    message
  };

  return showErrorToast(errorObj, actions);
};