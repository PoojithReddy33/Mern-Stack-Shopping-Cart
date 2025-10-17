const express = require('express');
const router = express.Router();

// Import controllers
const {
  getProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  getCategories,
  getBrands,
  searchProducts,
  getSearchSuggestions,
  getPopularSearchTerms,
  getProductById,
  getProductBySlug,
  checkProductAvailability,
  getProductReviews
} = require('../controllers/productController');

// Import middleware
const { optionalAuth } = require('../middleware/auth');

// Product listing routes
// @route   GET /api/products
// @desc    Get all products with pagination and filtering
// @access  Public
router.get('/', optionalAuth, getProducts);

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', getFeaturedProducts);

// @route   GET /api/products/new-arrivals
// @desc    Get new arrivals
// @access  Public
router.get('/new-arrivals', getNewArrivals);

// @route   GET /api/products/categories
// @desc    Get product categories with counts
// @access  Public
router.get('/categories', getCategories);

// @route   GET /api/products/brands
// @desc    Get product brands
// @access  Public
router.get('/brands', getBrands);

// Search routes
// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', searchProducts);

// @route   GET /api/products/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/search/suggestions', getSearchSuggestions);

// @route   GET /api/products/search/popular
// @desc    Get popular search terms
// @access  Public
router.get('/search/popular', getPopularSearchTerms);

// Category routes
// @route   GET /api/products/category/:category
// @desc    Get products by category
// @access  Public
router.get('/category/:category', getProductsByCategory);

// Product detail routes
// @route   GET /api/products/slug/:slug
// @desc    Get product by slug
// @access  Public
router.get('/slug/:slug', getProductBySlug);

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get('/:id', getProductById);

// @route   GET /api/products/:id/availability
// @desc    Check product availability
// @access  Public
router.get('/:id/availability', checkProductAvailability);

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews
// @access  Public
router.get('/:id/reviews', getProductReviews);

module.exports = router;