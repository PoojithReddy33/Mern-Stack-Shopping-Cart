import axios from 'axios';
import toast from 'react-hot-toast';
import { logError, createErrorObject, categorizeError, getErrorConfig, ErrorStrategies } from '../utils/errorHandler';

// Token management utilities
class TokenManager {
  static isTokenExpired(token) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      // Check if token expires within next 5 minutes
      return payload.exp < (currentTime + 300);
    } catch (error) {
      console.warn('Error parsing token:', error);
      return true;
    }
  }

  static async refreshToken() {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      throw new Error('No token to refresh');
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      const newToken = response.data.data.token;
      localStorage.setItem('token', newToken);
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  }

  static async getValidToken() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return null;
    }

    if (this.isTokenExpired(token)) {
      try {
        return await this.refreshToken();
      } catch (error) {
        return null;
      }
    }

    return token;
  }
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token with validation
api.interceptors.request.use(
  async (config) => {
    // Skip token validation for auth endpoints
    if (config.url?.includes('/auth/login') || 
        config.url?.includes('/auth/register') ||
        config.url?.includes('/auth/refresh')) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }

    // For other endpoints, ensure we have a valid token
    try {
      const validToken = await TokenManager.getValidToken();
      if (validToken) {
        config.headers.Authorization = `Bearer ${validToken}`;
      }
    } catch (error) {
      console.warn('Failed to get valid token:', error);
      // Continue without token - let the response interceptor handle 401
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling with enhanced categorization
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Create standardized error object
    const errorObj = createErrorObject(error, {
      url: originalRequest?.url,
      method: originalRequest?.method,
      timestamp: new Date().toISOString()
    });
    
    // Log error for debugging
    logError(error, errorObj.context);
    
    // Handle 401 errors with token refresh retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Don't retry for auth endpoints
      if (originalRequest.url?.includes('/auth/login') || 
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/refresh')) {
        
        if (originalRequest.url?.includes('/auth/refresh')) {
          // Token refresh failed, clear auth data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          if (window.location.pathname !== '/login') {
            toast.error('Session expired. Please login again.');
            window.location.href = '/login';
          }
        }
        return Promise.reject(errorObj);
      }

      // Try to refresh token and retry the original request
      try {
        const newToken = await TokenManager.refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Token refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (window.location.pathname !== '/login') {
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        }
        return Promise.reject(errorObj);
      }
    }
    
    // Handle errors based on strategy
    const config = getErrorConfig(errorObj.code);
    
    switch (config.strategy) {
      case ErrorStrategies.SHOW_ERROR:
        if (!originalRequest.suppressToast) {
          toast.error(errorObj.message);
        }
        break;
        
      case ErrorStrategies.SILENT_FAIL:
        // Don't show toast for silent failures
        break;
        
      case ErrorStrategies.REDIRECT_LOGIN:
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          toast.error(errorObj.message);
          window.location.href = '/login';
        }
        break;
        
      default:
        // For other strategies, show the error message unless suppressed
        if (!originalRequest.suppressToast && config.strategy !== ErrorStrategies.RETRY_WITH_BACKOFF) {
          toast.error(errorObj.message);
        }
        break;
    }
    
    return Promise.reject(errorObj);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
};

// Products API calls
export const productsAPI = {
  getProducts: (params = {}) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  searchProducts: (query) => api.get(`/products/search?q=${encodeURIComponent(query)}`),
  getProductsByCategory: (category) => api.get(`/products/category/${category}`),
};

// Enhanced Cart API calls with retry logic
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (item) => api.post('/cart/add', item),
  updateCartItem: (item) => api.put('/cart/update', item),
  removeFromCart: (productId, size) => api.delete(`/cart/remove/${productId}/${size}`),
  clearCart: () => api.delete('/cart/clear'),
  getCartTotal: () => api.get('/cart/total'),
  migrateCart: (guestCartItems) => api.post('/cart/merge', { items: guestCartItems }),
  
  // Enhanced methods with retry logic (to be used by CartContext)
  getCartWithRetry: async (context = {}) => {
    const { retryCartOperation } = await import('../utils/retryHandler');
    return retryCartOperation(() => api.get('/cart'), { operation: 'getCart', ...context });
  },
  
  addToCartWithRetry: async (item, context = {}) => {
    const { retryCartOperation } = await import('../utils/retryHandler');
    return retryCartOperation(() => api.post('/cart/add', item), { operation: 'addToCart', item, ...context });
  },
  
  updateCartItemWithRetry: async (item, context = {}) => {
    const { retryCartOperation } = await import('../utils/retryHandler');
    return retryCartOperation(() => api.put('/cart/update', item), { operation: 'updateCartItem', item, ...context });
  },
  
  removeFromCartWithRetry: async (productId, size, context = {}) => {
    const { retryCartOperation } = await import('../utils/retryHandler');
    return retryCartOperation(() => api.delete(`/cart/remove/${productId}/${size}`), { 
      operation: 'removeFromCart', 
      productId, 
      size, 
      ...context 
    });
  },
  
  clearCartWithRetry: async (context = {}) => {
    const { retryCartOperation } = await import('../utils/retryHandler');
    return retryCartOperation(() => api.delete('/cart/clear'), { operation: 'clearCart', ...context });
  },
  
  migrateCartWithRetry: async (guestCartItems, context = {}) => {
    const { retryCartOperation } = await import('../utils/retryHandler');
    return retryCartOperation(() => api.post('/cart/merge', { items: guestCartItems }), { 
      operation: 'migrateCart', 
      itemCount: guestCartItems.length, 
      ...context 
    });
  }
};

// Orders API calls
export const ordersAPI = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getOrders: () => api.get('/orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  updateOrder: (id, updateData) => api.put(`/orders/${id}`, updateData),
  calculateTotal: (orderData) => api.post('/orders/calculate-total', orderData),
};

// Payment API calls
export const paymentAPI = {
  initiatePayment: (paymentData) => api.post('/payment/initiate', paymentData),
  getPaymentStatus: (orderId) => api.get(`/payment/status/${orderId}`),
};

// Export TokenManager for external use
export { TokenManager };

export default api;