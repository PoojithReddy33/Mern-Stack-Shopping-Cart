import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container, Box } from '@mui/material';

import ErrorBoundary from './components/common/ErrorBoundary';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
        <Container 
          component="main" 
          sx={{ 
            flex: 1, 
            py: 3,
            maxWidth: { xs: 'sm', sm: 'md', md: 'lg', lg: 'xl' }
          }}
        >
          <ErrorBoundary>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected routes */}
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <OrderHistoryPage />
                </ProtectedRoute>
              } />

              {/* Redirect old routes */}
              <Route path="/shop" element={<Navigate to="/products" replace />} />
              <Route path="/account" element={<Navigate to="/profile" replace />} />
              
              {/* 404 Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>
        </Container>
        <ErrorBoundary>
          <Footer />
        </ErrorBoundary>
      </Box>
    </ErrorBoundary>
  );
}

export default App;