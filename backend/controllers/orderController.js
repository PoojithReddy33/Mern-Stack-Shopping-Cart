const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Calculate order total
// @route   POST /api/orders/calculate-total
// @access  Private
const calculateOrderTotal = async (req, res) => {
  try {
    const { shippingAddress, billingAddress, appliedCoupons = [] } = req.body;

    // Get user's cart
    const cart = await Cart.findByUser(req.user._id);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cart is empty' }
      });
    }

    // Validate cart items and check availability
    const validationIssues = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      
      if (!product || !product.isActive) {
        validationIssues.push({
          type: 'unavailable',
          productId: item.product,
          message: 'Product is no longer available'
        });
        continue;
      }

      if (!product.isSizeAvailable(item.size, item.quantity)) {
        validationIssues.push({
          type: 'insufficient_stock',
          productId: item.product,
          size: item.size,
          message: `Insufficient stock for ${product.name} - Size ${item.size}`
        });
        continue;
      }

      // Use current product price
      subtotal += product.currentPrice * item.quantity;
    }

    if (validationIssues.length > 0) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Cart validation failed',
          issues: validationIssues
        }
      });
    }

    // Calculate tax (18% GST)
    const taxRate = 0.18;
    const tax = Math.round(subtotal * taxRate * 100) / 100;

    // Calculate shipping
    const freeShippingThreshold = 999;
    const shippingCost = 99;
    const shipping = subtotal >= freeShippingThreshold ? 0 : shippingCost;

    // Apply coupon discounts (simplified validation)
    let totalDiscount = 0;
    const validCoupons = {
      'WELCOME10': { discount: 100, type: 'fixed', minAmount: 500 },
      'SAVE20': { discount: 20, type: 'percentage', minAmount: 1000 },
      'FLAT50': { discount: 50, type: 'fixed', minAmount: 300 }
    };

    for (const couponCode of appliedCoupons) {
      const coupon = validCoupons[couponCode.toUpperCase()];
      if (coupon && subtotal >= coupon.minAmount) {
        if (coupon.type === 'percentage') {
          totalDiscount += Math.round((subtotal * coupon.discount) / 100);
        } else {
          totalDiscount += coupon.discount;
        }
      }
    }

    // Calculate final total
    const total = Math.max(0, subtotal + tax + shipping - totalDiscount);

    const orderSummary = {
      subtotal,
      tax,
      shipping,
      discount: totalDiscount,
      total,
      currency: 'INR',
      itemCount: cart.itemCount,
      appliedCoupons,
      freeShippingEligible: subtotal >= freeShippingThreshold
    };

    res.json({
      success: true,
      data: {
        orderSummary,
        cartItems: cart.items
      }
    });
  } catch (error) {
    console.error('Calculate order total error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while calculating order total' }
    });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { 
      shippingAddress, 
      billingAddress, 
      paymentMethod = 'phonepay',
      customerNotes 
    } = req.body;

    // Validate required fields
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        error: { message: 'Shipping address is required' }
      });
    }

    // Get user's cart
    const cart = await Cart.findByUser(req.user._id);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cart is empty' }
      });
    }

    // Validate cart items and prepare order items
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.product);
      
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          error: { message: `Product ${cartItem.product} is no longer available` }
        });
      }

      if (!product.isSizeAvailable(cartItem.size, cartItem.quantity)) {
        return res.status(400).json({
          success: false,
          error: { message: `Insufficient stock for ${product.name} - Size ${cartItem.size}` }
        });
      }

      // Create order item with product snapshot
      const orderItem = {
        product: product._id,
        productSnapshot: {
          name: product.name,
          description: product.shortDescription || product.description,
          brand: product.brand,
          category: product.category,
          images: product.images.slice(0, 2) // Keep first 2 images
        },
        size: cartItem.size,
        quantity: cartItem.quantity,
        price: product.currentPrice
      };

      orderItems.push(orderItem);
      subtotal += product.currentPrice * cartItem.quantity;
    }

    // Calculate totals
    const taxRate = 0.18;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const shipping = subtotal >= 999 ? 0 : 99;
    
    // Apply cart coupons
    let discount = 0;
    const appliedCoupons = [];
    
    for (const coupon of cart.appliedCoupons) {
      discount += coupon.discount;
      appliedCoupons.push({
        code: coupon.code,
        discount: coupon.discount,
        type: 'fixed' // Simplified for now
      });
    }

    const total = Math.max(0, subtotal + tax + shipping - discount);

    // Create order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      pricing: {
        subtotal,
        tax,
        shipping,
        discount,
        total
      },
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        email: shippingAddress.email || req.user.email,
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || 'India'
      },
      billingAddress: billingAddress || {
        ...shippingAddress,
        sameAsShipping: true
      },
      payment: {
        method: paymentMethod,
        status: 'pending'
      },
      appliedCoupons,
      customerNotes: customerNotes || ''
    });

    await order.save();

    // Reserve stock for all items
    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.product);
      if (product) {
        await product.reserveStock(cartItem.size, cartItem.quantity);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.pricing.total,
          currency: order.currency,
          createdAt: order.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    
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
      error: { message: 'Server error while creating order' }
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
const getUserOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      startDate,
      endDate 
    } = req.query;

    const options = { user: req.user._id };
    
    if (status) {
      options.status = status;
    }
    
    if (startDate || endDate) {
      options.createdAt = {};
      if (startDate) options.createdAt.$gte = new Date(startDate);
      if (endDate) options.createdAt.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(options)
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const totalOrders = await Order.countDocuments(options);
    const totalPages = Math.ceil(totalOrders / limitNum);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalOrders,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching orders' }
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user._id
    }).populate('items.product', 'name images category brand');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Order not found' }
      });
    }

    res.json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid order ID format' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching order' }
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: id,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Order not found' }
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Order cannot be cancelled at this stage' }
      });
    }

    // Release reserved stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        await product.releaseStock(item.size, item.quantity);
      }
    }

    // Update order status
    await order.updateStatus('cancelled', reason || 'Cancelled by customer', req.user._id);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order
      }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while cancelling order' }
    });
  }
};

module.exports = {
  calculateOrderTotal,
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder
};