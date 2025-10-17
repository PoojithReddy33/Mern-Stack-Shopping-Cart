const User = require('../models/User');
const Cart = require('../models/Cart');
const { generateToken } = require('../middleware/auth');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { email, password, profile } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { message: 'User with this email already exists' }
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || undefined,
        dateOfBirth: profile.dateOfBirth || undefined
      }
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create empty cart for user
    const cart = new Cart({
      user: user._id,
      items: []
    });
    await cart.save();

    // Return user data and token
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validationErrors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error during registration' }
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email and include password for comparison
    const user = await User.findByEmail(email).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: 'Account is deactivated. Please contact support.' }
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data and token
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during login' }
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching profile' }
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token from storage. However, we can track this server-side
    // for analytics or security purposes.
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during logout' }
    });
  }
};

// @desc    Refresh JWT token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = async (req, res) => {
  try {
    // Generate new token for the authenticated user
    const token = generateToken(req.user._id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during token refresh' }
    });
  }
};

// @desc    Check if email exists
// @route   POST /api/auth/check-email
// @access  Public
const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findByEmail(email);
    
    res.json({
      success: true,
      data: {
        exists: !!user
      }
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while checking email' }
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  refreshToken,
  checkEmail
};