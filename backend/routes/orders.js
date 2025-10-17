const express = require('express');
const router = express.Router();

// Import controllers
const {
  calculateOrderTotal,
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder
} = require('../controllers/orderController');

// Import middleware
const { auth } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

// Validation rules
const validateOrderCreation = [
  body('shippingAddress.firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('shippingAddress.lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  
  body('shippingAddress.phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  
  body('shippingAddress.street')
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  
  body('shippingAddress.city')
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  
  body('shippingAddress.state')
    .notEmpty()
    .withMessage('State is required')
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  
  body('shippingAddress.postalCode')
    .matches(/^[0-9]{6}$/)
    .withMessage('Postal code must be exactly 6 digits'),
  
  body('paymentMethod')
    .optional()
    .isIn(['phonepay', 'razorpay', 'paytm', 'upi', 'card', 'netbanking', 'cod'])
    .withMessage('Invalid payment method'),
  
  body('customerNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Customer notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

const validateOrderId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
  handleValidationErrors
];

// Order routes - all require authentication

// @route   POST /api/orders/calculate-total
// @desc    Calculate order total
// @access  Private
router.post('/calculate-total', auth, calculateOrderTotal);

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', auth, validateOrderCreation, createOrder);

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', auth, getUserOrders);

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, validateOrderId, getOrderById);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', auth, validateOrderId, cancelOrder);

module.exports = router;