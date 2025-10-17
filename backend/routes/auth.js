const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  getMe,
  logout,
  refreshToken,
  checkEmail
} = require('../controllers/authController');

const {
  getProfile,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  deactivateAccount
} = require('../controllers/profileController');

// Import middleware
const { auth } = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validateEmail,
  validateProfileUpdate,
  validateAddress,
  validatePasswordChange
} = require('../middleware/validation');

// Authentication routes
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegistration, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, login);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, getMe);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, logout);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', auth, refreshToken);

// @route   POST /api/auth/check-email
// @desc    Check if email exists
// @access  Public
router.post('/check-email', validateEmail, checkEmail);

// Profile management routes
// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, validateProfileUpdate, updateProfile);

// @route   PUT /api/auth/profile/password
// @desc    Change user password
// @access  Private
router.put('/profile/password', auth, validatePasswordChange, changePassword);

// @route   POST /api/auth/profile/addresses
// @desc    Add user address
// @access  Private
router.post('/profile/addresses', auth, validateAddress, addAddress);

// @route   PUT /api/auth/profile/addresses/:addressId
// @desc    Update user address
// @access  Private
router.put('/profile/addresses/:addressId', auth, validateAddress, updateAddress);

// @route   DELETE /api/auth/profile/addresses/:addressId
// @desc    Delete user address
// @access  Private
router.delete('/profile/addresses/:addressId', auth, deleteAddress);

// @route   PUT /api/auth/profile/addresses/:addressId/default
// @desc    Set default address
// @access  Private
router.put('/profile/addresses/:addressId/default', auth, setDefaultAddress);

// @route   PUT /api/auth/profile/deactivate
// @desc    Deactivate user account
// @access  Private
router.put('/profile/deactivate', auth, deactivateAccount);

module.exports = router;