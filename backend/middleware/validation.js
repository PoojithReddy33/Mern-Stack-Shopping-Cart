const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errorMessages
      }
    });
  }
  
  next();
};

// User registration validation
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('profile.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('profile.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('profile.phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('profile.phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  
  handleValidationErrors
];

// Address validation
const validateAddress = [
  body('addresses.*.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  
  body('addresses.*.city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('City can only contain letters and spaces'),
  
  body('addresses.*.state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('State can only contain letters and spaces'),
  
  body('addresses.*.postalCode')
    .matches(/^[0-9]{6}$/)
    .withMessage('Postal code must be exactly 6 digits'),
  
  body('addresses.*.type')
    .optional()
    .isIn(['shipping', 'billing', 'both'])
    .withMessage('Address type must be shipping, billing, or both'),
  
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Email validation (for password reset, etc.)
const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

// Cart validation
const validateCartItem = [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('size')
    .notEmpty()
    .withMessage('Size is required')
    .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
    .withMessage('Invalid size selection'),
  
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  
  body('color')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Color name must be between 1 and 50 characters'),
  
  handleValidationErrors
];

// Order validation
const validateOrderCreation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  
  body('items.*.productId')
    .isMongoId()
    .withMessage('Invalid product ID in order items'),
  
  body('items.*.quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Item quantity must be between 1 and 10'),
  
  body('items.*.size')
    .notEmpty()
    .withMessage('Size is required for all items'),
  
  body('shippingAddress.firstName')
    .trim()
    .notEmpty()
    .withMessage('Shipping first name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('shippingAddress.lastName')
    .trim()
    .notEmpty()
    .withMessage('Shipping last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  
  body('shippingAddress.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid shipping email is required'),
  
  body('shippingAddress.phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Shipping phone must be 10 digits'),
  
  body('shippingAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Shipping street address is required')
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  
  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('Shipping city is required')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('City can only contain letters and spaces'),
  
  body('shippingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('Shipping state is required')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('State can only contain letters and spaces'),
  
  body('shippingAddress.postalCode')
    .matches(/^[0-9]{6}$/)
    .withMessage('Shipping postal code must be 6 digits'),
  
  body('billingAddress.firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Billing first name cannot exceed 50 characters'),
  
  body('billingAddress.lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Billing last name cannot exceed 50 characters'),
  
  body('billingAddress.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid billing email is required if provided'),
  
  body('billingAddress.phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Billing phone must be 10 digits if provided'),
  
  handleValidationErrors
];

// Search validation
const validateSearch = [
  body('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Search query contains invalid characters'),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateAddress,
  validatePasswordChange,
  validateEmail,
  validateCartItem,
  validateOrderCreation,
  validateSearch,
  validatePagination,
  handleValidationErrors
};