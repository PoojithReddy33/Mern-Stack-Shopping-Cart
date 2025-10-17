const express = require('express');
const router = express.Router();

// Import controllers
const {
  initiatePayment,
  handlePaymentCallback,
  checkPaymentStatus,
  initiateRefund
} = require('../controllers/paymentController');

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
const validatePaymentInitiation = [
  body('orderId')
    .isMongoId()
    .withMessage('Invalid order ID'),
  
  body('returnUrl')
    .optional()
    .isURL()
    .withMessage('Invalid return URL'),
  
  body('callbackUrl')
    .optional()
    .isURL()
    .withMessage('Invalid callback URL'),
  
  handleValidationErrors
];

const validateRefund = [
  body('orderId')
    .isMongoId()
    .withMessage('Invalid order ID'),
  
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Refund amount must be greater than 0'),
  
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),
  
  handleValidationErrors
];

const validateTransactionId = [
  param('transactionId')
    .notEmpty()
    .withMessage('Transaction ID is required')
    .isLength({ min: 10, max: 100 })
    .withMessage('Invalid transaction ID format'),
  
  handleValidationErrors
];

// Payment routes

// @route   POST /api/payment/initiate
// @desc    Initiate PhonePe payment
// @access  Private
router.post('/initiate', auth, validatePaymentInitiation, initiatePayment);

// @route   POST /api/payment/callback
// @desc    Handle PhonePe payment callback
// @access  Public (webhook)
router.post('/callback', handlePaymentCallback);

// @route   GET /api/payment/status/:transactionId
// @desc    Check payment status
// @access  Private
router.get('/status/:transactionId', auth, validateTransactionId, checkPaymentStatus);

// @route   POST /api/payment/refund
// @desc    Initiate refund
// @access  Private
router.post('/refund', auth, validateRefund, initiateRefund);

module.exports = router;