const Product = require('../models/Product');

// @desc    Get all products with pagination and filtering
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      size,
      color,
      availability,
      featured,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query object
    const query = { isActive: true };

    // Category filtering
    if (category) {
      query.category = category.toLowerCase();
    }
    if (subcategory) {
      query.subcategory = subcategory.toLowerCase();
    }

    // Brand filtering
    if (brand) {
      query.brand = new RegExp(brand, 'i');
    }

    // Price filtering
    if (minPrice || maxPrice) {
      query['price.original'] = {};
      if (minPrice) query['price.original'].$gte = parseFloat(minPrice);
      if (maxPrice) query['price.original'].$lte = parseFloat(maxPrice);
    }

    // Size filtering
    if (size) {
      query['sizes.size'] = size.toUpperCase();
    }

    // Color filtering
    if (color) {
      query['colors.name'] = new RegExp(color, 'i');
    }

    // Availability filtering
    if (availability) {
      query['availability.status'] = availability;
    }

    // Featured products
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Sorting options
    const sortOptions = {};
    const validSortFields = ['createdAt', 'price.original', 'name', 'ratings.average'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    sortOptions[sortField] = sortOrder;

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);

    // Get available filters for the current query
    const availableCategories = await Product.distinct('category', { isActive: true });
    const availableBrands = await Product.distinct('brand', { isActive: true });
    const priceRange = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price.original' },
          maxPrice: { $max: '$price.original' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProducts,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum
        },
        filters: {
          categories: availableCategories,
          brands: availableBrands,
          priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching products' }
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const {
      page = 1,
      limit = 12,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    const query = {
      category: category.toLowerCase(),
      isActive: true
    };

    if (subcategory) {
      query.subcategory = subcategory.toLowerCase();
    }
    if (brand) {
      query.brand = new RegExp(brand, 'i');
    }
    if (minPrice || maxPrice) {
      query['price.original'] = {};
      if (minPrice) query['price.original'].$gte = parseFloat(minPrice);
      if (maxPrice) query['price.original'].$lte = parseFloat(maxPrice);
    }

    // Sorting
    const sortOptions = {};
    const sortField = ['createdAt', 'price.original', 'name', 'ratings.average'].includes(sort) ? sort : 'createdAt';
    sortOptions[sortField] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);

    // Get subcategories for this category
    const subcategories = await Product.distinct('subcategory', {
      category: category.toLowerCase(),
      isActive: true
    });

    res.json({
      success: true,
      data: {
        products,
        category,
        subcategories: subcategories.filter(sub => sub), // Remove null/empty values
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProducts,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching products by category' }
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({
      isActive: true,
      isFeatured: true,
      'availability.status': 'in-stock'
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.json({
      success: true,
      data: {
        products
      }
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching featured products' }
    });
  }
};

// @desc    Get new arrivals
// @route   GET /api/products/new-arrivals
// @access  Public
const getNewArrivals = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({
      isActive: true,
      'availability.status': 'in-stock'
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.json({
      success: true,
      data: {
        products
      }
    });
  } catch (error) {
    console.error('Get new arrivals error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching new arrivals' }
    });
  }
};

// @desc    Get product categories with counts
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          subcategories: { $addToSet: '$subcategory' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.map(cat => ({
          name: cat._id,
          count: cat.count,
          subcategories: cat.subcategories.filter(sub => sub) // Remove null values
        }))
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching categories' }
    });
  }
};

// @desc    Get product brands
// @route   GET /api/products/brands
// @access  Public
const getBrands = async (req, res) => {
  try {
    const brands = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        brands: brands.map(brand => ({
          name: brand._id,
          count: brand.count
        }))
      }
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching brands' }
    });
  }
};

module.exports = {
  getProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  getCategories,
  getBrands
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const {
      q: searchTerm,
      page = 1,
      limit = 12,
      category,
      brand,
      minPrice,
      maxPrice,
      sort = 'relevance',
      order = 'desc'
    } = req.query;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Search term is required' }
      });
    }

    // Build search query
    const searchQuery = {
      $text: { $search: searchTerm.trim() },
      isActive: true
    };

    // Add filters
    if (category) {
      searchQuery.category = category.toLowerCase();
    }
    if (brand) {
      searchQuery.brand = new RegExp(brand, 'i');
    }
    if (minPrice || maxPrice) {
      searchQuery['price.original'] = {};
      if (minPrice) searchQuery['price.original'].$gte = parseFloat(minPrice);
      if (maxPrice) searchQuery['price.original'].$lte = parseFloat(maxPrice);
    }

    // Sorting options
    let sortOptions = {};
    if (sort === 'relevance') {
      sortOptions = { score: { $meta: 'textScore' } };
    } else {
      const validSortFields = ['createdAt', 'price.original', 'name', 'ratings.average'];
      const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
      const sortOrder = order === 'asc' ? 1 : -1;
      sortOptions[sortField] = sortOrder;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute search query
    let query = Product.find(searchQuery);
    
    if (sort === 'relevance') {
      query = query.select({ score: { $meta: 'textScore' } });
    }

    const products = await query
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // Get total count
    const totalProducts = await Product.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalProducts / limitNum);

    // Get search suggestions (similar products)
    const suggestions = await Product.find({
      $text: { $search: searchTerm.trim() },
      isActive: true
    })
      .select('name category brand')
      .limit(5);

    res.json({
      success: true,
      data: {
        products,
        searchTerm,
        suggestions: suggestions.map(p => ({
          name: p.name,
          category: p.category,
          brand: p.brand
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProducts,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while searching products' }
    });
  }
};

// @desc    Get search suggestions
// @route   GET /api/products/search/suggestions
// @access  Public
const getSearchSuggestions = async (req, res) => {
  try {
    const { q: searchTerm, limit = 5 } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    // Search for products that match the term
    const productSuggestions = await Product.find({
      $or: [
        { name: { $regex: searchTerm.trim(), $options: 'i' } },
        { brand: { $regex: searchTerm.trim(), $options: 'i' } },
        { category: { $regex: searchTerm.trim(), $options: 'i' } },
        { tags: { $regex: searchTerm.trim(), $options: 'i' } }
      ],
      isActive: true
    })
      .select('name brand category')
      .limit(parseInt(limit));

    // Get unique suggestions
    const suggestions = [];
    const seen = new Set();

    productSuggestions.forEach(product => {
      // Add product name
      if (!seen.has(product.name.toLowerCase())) {
        suggestions.push({
          text: product.name,
          type: 'product',
          category: product.category
        });
        seen.add(product.name.toLowerCase());
      }

      // Add brand if it matches
      if (product.brand.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !seen.has(product.brand.toLowerCase())) {
        suggestions.push({
          text: product.brand,
          type: 'brand',
          category: null
        });
        seen.add(product.brand.toLowerCase());
      }

      // Add category if it matches
      if (product.category.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !seen.has(product.category.toLowerCase())) {
        suggestions.push({
          text: product.category,
          type: 'category',
          category: product.category
        });
        seen.add(product.category.toLowerCase());
      }
    });

    res.json({
      success: true,
      data: {
        suggestions: suggestions.slice(0, parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching search suggestions' }
    });
  }
};

// @desc    Get popular search terms
// @route   GET /api/products/search/popular
// @access  Public
const getPopularSearchTerms = async (req, res) => {
  try {
    // This would typically come from a search analytics collection
    // For now, we'll return popular categories and brands
    const popularCategories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const popularBrands = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const popularTerms = [
      ...popularCategories.map(cat => ({ term: cat._id, type: 'category' })),
      ...popularBrands.map(brand => ({ term: brand._id, type: 'brand' }))
    ];

    res.json({
      success: true,
      data: {
        popularTerms: popularTerms.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Get popular search terms error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching popular search terms' }
    });
  }
};

module.exports = {
  getProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  getCategories,
  getBrands,
  searchProducts,
  getSearchSuggestions,
  getPopularSearchTerms
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      isActive: true
    }).select('-__v');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' }
      });
    }

    // Get related products (same category, different product)
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    })
      .limit(4)
      .select('name price images category brand ratings availability');

    // Get size availability
    const sizeAvailability = product.sizes.map(size => ({
      size: size.size,
      available: (size.stock - size.reserved) > 0,
      stock: size.stock - size.reserved
    }));

    res.json({
      success: true,
      data: {
        product: {
          ...product.toObject(),
          sizeAvailability
        },
        relatedProducts
      }
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid product ID format' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching product' }
    });
  }
};

// @desc    Get product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      'seo.slug': slug,
      isActive: true
    }).select('-__v');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' }
      });
    }

    // Get related products
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    })
      .limit(4)
      .select('name price images category brand ratings availability seo.slug');

    // Get size availability
    const sizeAvailability = product.sizes.map(size => ({
      size: size.size,
      available: (size.stock - size.reserved) > 0,
      stock: size.stock - size.reserved
    }));

    res.json({
      success: true,
      data: {
        product: {
          ...product.toObject(),
          sizeAvailability
        },
        relatedProducts
      }
    });
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching product' }
    });
  }
};

// @desc    Check product availability
// @route   GET /api/products/:id/availability
// @access  Public
const checkProductAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { size, quantity = 1 } = req.query;

    const product = await Product.findOne({
      _id: id,
      isActive: true
    }).select('sizes availability name');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' }
      });
    }

    let availability = {
      inStock: product.availability.status === 'in-stock',
      status: product.availability.status
    };

    if (size) {
      const sizeInfo = product.sizes.find(s => s.size === size.toUpperCase());
      if (!sizeInfo) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid size for this product' }
        });
      }

      const availableStock = sizeInfo.stock - sizeInfo.reserved;
      availability = {
        ...availability,
        size: size.toUpperCase(),
        available: availableStock >= parseInt(quantity),
        stock: availableStock,
        requestedQuantity: parseInt(quantity)
      };
    } else {
      // Return availability for all sizes
      availability.sizes = product.sizes.map(size => ({
        size: size.size,
        available: (size.stock - size.reserved) > 0,
        stock: size.stock - size.reserved
      }));
    }

    res.json({
      success: true,
      data: {
        productName: product.name,
        availability
      }
    });
  } catch (error) {
    console.error('Check product availability error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid product ID format' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while checking availability' }
    });
  }
};

// @desc    Get product reviews/ratings summary
// @route   GET /api/products/:id/reviews
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      isActive: true
    }).select('name ratings');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' }
      });
    }

    // This would typically fetch from a separate Reviews collection
    // For now, return the summary from the product
    res.json({
      success: true,
      data: {
        productName: product.name,
        ratings: {
          average: product.ratings.average,
          count: product.ratings.count,
          distribution: {
            5: 0, // These would come from actual review data
            4: 0,
            3: 0,
            2: 0,
            1: 0
          }
        },
        reviews: [] // This would contain actual review objects
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid product ID format' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching reviews' }
    });
  }
};

module.exports = {
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
};