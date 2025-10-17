const express = require('express');
const router = express.Router();

// Import controllers
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
  getCartSummary,
  mergeGuestCart,
  validateCart,
  updateShippingAddress
} = require('../controllers/cartController');

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
const validateAddToCart = [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('size')
    .notEmpty()
    .withMessage('Size is required')
    .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42'])
    .withMessage('Invalid size'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  handleValidationErrors
];

const validateUpdateCart = [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('size')
    .notEmpty()
    .withMessage('Size is required')
    .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42'])
    .withMessage('Invalid size'),
  body('quantity')
    .isInt({ min: 0, max: 10 })
    .withMessage('Quantity must be between 0 and 10'),
  handleValidationErrors
];

const validateRemoveFromCart = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  param('size')
    .notEmpty()
    .withMessage('Size is required')
    .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42'])
    .withMessage('Invalid size'),
  handleValidationErrors
];

const validateCoupon = [
  body('couponCode')
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Coupon code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Coupon code can only contain uppercase letters and numbers'),
  handleValidationErrors
];

// Cart routes - all require authentication

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', auth, getCart);

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/add', auth, validateAddToCart, addToCart);

// @route   PUT /api/cart/update
// @desc    Update cart item quantity
// @access  Private
router.put('/update', auth, validateUpdateCart, updateCartItem);

// @route   DELETE /api/cart/remove/:productId/:size
// @desc    Remove item from cart
// @access  Private
router.delete('/remove/:productId/:size', auth, validateRemoveFromCart, removeFromCart);

// @route   DELETE /api/cart/clear
// @desc    Clear entire cart
// @access  Private
router.delete('/clear', auth, clearCart);

// @route   POST /api/cart/coupon
// @desc    Apply coupon to cart
// @access  Private
router.post('/coupon', auth, validateCoupon, applyCoupon);

// @route   DELETE /api/cart/coupon/:couponCode
// @desc    Remove coupon from cart
// @access  Private
router.delete('/coupon/:couponCode', auth, removeCoupon);



// @route   GET /api/cart/summary
// @desc    Get cart totals and summary
// @access  Private
router.get('/summary', auth, getCartSummary);

// @route   POST /api/cart/merge
// @desc    Merge guest cart with user cart
// @access  Private
router.post('/merge', auth, mergeGuestCart);

// @route   POST /api/cart/validate
// @desc    Validate cart items
// @access  Private
router.post('/validate', auth, validateCart);

// @route   PUT /api/cart/shipping-address
// @desc    Update shipping address for cart
// @access  Private
router.put('/shipping-address', auth, updateShippingAddress);

module.exports = router;