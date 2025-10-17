import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Enhanced error handling
    const errorData = error.response?.data?.error || {};
    const status = error.response?.status;
    const message = errorData.message || 'An error occurred';
    
    // Add error code and details to the error object
    error.code = errorData.code;
    error.details = errorData.details;
    
    // Handle specific error cases
    if (status === 401) {
      // Don't show toast for token refresh attempts
      if (!error.config?.url?.includes('/auth/refresh')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        }
      }
    } else if (status === 403) {
      toast.error('Access denied');
    } else if (status === 404) {
      // Don't show toast for 404s on optional resources
      if (!error.config?.suppressNotFoundToast) {
        toast.error('Resource not found');
      }
    } else if (status === 409) {
      // Conflict errors (like insufficient stock)
      toast.error(message);
    } else if (status === 422) {
      // Validation errors - don't show toast as they should be handled by forms
      console.warn('Validation error:', errorData);
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (status >= 400) {
      // Other client errors
      toast.error(message);
    }
    
    // Handle network errors
    if (!error.response && error.request) {
      error.code = 'NETWORK_ERROR';
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  logout: () => api.post('/auth/logout'),
};

// Products API calls
export const productsAPI = {
  getProducts: (params = {}) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  searchProducts: (query) => api.get(`/products/search?q=${encodeURIComponent(query)}`),
  getProductsByCategory: (category) => api.get(`/products/category/${category}`),
};

// Cart API calls
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (item) => api.post('/cart/add', item),
  updateCartItem: (item) => api.put('/cart/update', item),
  removeFromCart: (productId, size) => api.delete(`/cart/remove/${productId}/${size}`),
  clearCart: () => api.delete('/cart/clear'),
  getCartTotal: () => api.get('/cart/total'),
  migrateCart: (guestCartItems) => api.post('/cart/merge', { items: guestCartItems }),
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

export default api;