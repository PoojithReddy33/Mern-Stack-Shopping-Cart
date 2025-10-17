const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findByUser(req.user._id);
    
    if (!cart) {
      // Create empty cart if none exists
      cart = new Cart({
        user: req.user._id,
        items: []
      });
      await cart.save();
    }

    res.json({
      success: true,
      data: {
        cart
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching cart' }
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, size, quantity = 1 } = req.body;

  // Validate quantity
  const qty = parseInt(quantity);
  if (qty < 1 || qty > 10) {
    throw new AppError('Quantity must be between 1 and 10', 400, 'INVALID_QUANTITY');
  }

  // Check if product exists and is active
  const product = await Product.findOne({
    _id: productId,
    isActive: true
  });

  if (!product) {
    throw new AppError('Product not found or unavailable', 404, 'PRODUCT_NOT_FOUND');
  }

  // Check if size is available for the product
  const sizeInfo = product.sizes.find(s => s.size === size.toUpperCase());
  if (!sizeInfo) {
    throw new AppError(`Size ${size.toUpperCase()} is not available for this product`, 400, 'INVALID_SIZE');
  }

  // Check stock availability
  const availableStock = sizeInfo.stock - sizeInfo.reserved;
  if (availableStock < qty) {
    throw new AppError(
      `Insufficient stock for size ${size.toUpperCase()}. Only ${availableStock} items available.`,
      409,
      'INSUFFICIENT_STOCK',
      { availableStock, requestedQuantity: qty, size: size.toUpperCase() }
    );
  }

  // Get or create cart
  let cart = await Cart.findByUser(req.user._id);
  if (!cart) {
    cart = new Cart({
      user: req.user._id,
      items: []
    });
  }

  // Add item to cart
  await cart.addItem(productId, size.toUpperCase(), qty, product.currentPrice);

  // Reserve stock
  await product.reserveStock(size.toUpperCase(), qty);

  res.status(201).json({
    success: true,
    message: 'Item added to cart successfully',
    data: {
      cart
    }
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { productId, size, quantity } = req.body;

    // Validate required fields
    if (!productId || !size || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'Product ID, size, and quantity are required' }
      });
    }

    const qty = parseInt(quantity);
    if (qty < 0 || qty > 10) {
      return res.status(400).json({
        success: false,
        error: { message: 'Quantity must be between 0 and 10' }
      });
    }

    // Get cart
    const cart = await Cart.findByUser(req.user._id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cart not found' }
      });
    }

    // Find existing item in cart
    const existingItem = cart.items.find(item => 
      item.product.toString() === productId && item.size === size.toUpperCase()
    );

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: { message: 'Item not found in cart' }
      });
    }

    // Get product for stock validation
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' }
      });
    }

    // Calculate quantity difference
    const quantityDiff = qty - existingItem.quantity;

    // If increasing quantity, check availability
    if (quantityDiff > 0) {
      if (!product.isSizeAvailable(size.toUpperCase(), quantityDiff)) {
        return res.status(400).json({
          success: false,
          error: { message: `Insufficient stock for size ${size.toUpperCase()}` }
        });
      }
      // Reserve additional stock
      await product.reserveStock(size.toUpperCase(), quantityDiff);
    } else if (quantityDiff < 0) {
      // Release reserved stock
      await product.releaseStock(size.toUpperCase(), Math.abs(quantityDiff));
    }

    // Update cart item
    await cart.updateItemQuantity(productId, size.toUpperCase(), qty);

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    
    if (error.message.includes('not found') || error.message.includes('stock')) {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while updating cart item' }
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId/:size
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { productId, size } = req.params;

    // Get cart
    const cart = await Cart.findByUser(req.user._id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cart not found' }
      });
    }

    // Find existing item in cart
    const existingItem = cart.items.find(item => 
      item.product.toString() === productId && item.size === size.toUpperCase()
    );

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: { message: 'Item not found in cart' }
      });
    }

    // Release reserved stock
    const product = await Product.findById(productId);
    if (product) {
      await product.releaseStock(size.toUpperCase(), existingItem.quantity);
    }

    // Remove item from cart
    await cart.removeItem(productId, size.toUpperCase());

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while removing item from cart' }
    });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findByUser(req.user._id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cart not found' }
      });
    }

    // Release all reserved stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (product) {
        await product.releaseStock(item.size, item.quantity);
      }
    }

    // Clear cart
    await cart.clearCart();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while clearing cart' }
    });
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/cart/coupon
// @access  Private
const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        error: { message: 'Coupon code is required' }
      });
    }

    const cart = await Cart.findByUser(req.user._id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cart not found' }
      });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot apply coupon to empty cart' }
      });
    }

    // Simple coupon validation (in real app, this would check a Coupons collection)
    const validCoupons = {
      'WELCOME10': { discount: 100, type: 'fixed', minAmount: 500 },
      'SAVE20': { discount: 20, type: 'percentage', minAmount: 1000 },
      'FLAT50': { discount: 50, type: 'fixed', minAmount: 300 }
    };

    const coupon = validCoupons[couponCode.toUpperCase()];
    if (!coupon) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid coupon code' }
      });
    }

    // Check minimum amount
    if (cart.totals.subtotal < coupon.minAmount) {
      return res.status(400).json({
        success: false,
        error: { message: `Minimum order amount of ₹${coupon.minAmount} required for this coupon` }
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = Math.round((cart.totals.subtotal * coupon.discount) / 100);
    } else {
      discountAmount = coupon.discount;
    }

    // Apply coupon
    await cart.applyCoupon(couponCode.toUpperCase(), discountAmount);

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        cart,
        appliedDiscount: discountAmount
      }
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    
    if (error.message.includes('already applied')) {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while applying coupon' }
    });
  }
};

// @desc    Remove coupon from cart
// @route   DELETE /api/cart/coupon/:couponCode
// @access  Private
const removeCoupon = async (req, res) => {
  try {
    const { couponCode } = req.params;

    const cart = await Cart.findByUser(req.user._id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cart not found' }
      });
    }

    await cart.removeCoupon(couponCode.toUpperCase());

    res.json({
      success: true,
      message: 'Coupon removed successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    console.error('Remove coupon error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while removing coupon' }
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon
};

// @desc    Get cart totals and summary
// @route   GET /api/cart/summary
// @access  Private
const getCartSummary = async (req, res) => {
  try {
    const cart = await Cart.findByUser(req.user._id);
    
    if (!cart) {
      return res.json({
        success: true,
        data: {
          summary: {
            itemCount: 0,
            uniqueItemCount: 0,
            subtotal: 0,
            tax: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            currency: 'INR'
          }
        }
      });
    }

    // Calculate fresh totals
    cart.calculateTotals();

    const summary = {
      itemCount: cart.itemCount,
      uniqueItemCount: cart.uniqueItemCount,
      subtotal: cart.totals.subtotal,
      tax: cart.totals.tax,
      shipping: cart.totals.shipping,
      discount: cart.totals.discount,
      total: cart.totals.total,
      currency: cart.currency,
      appliedCoupons: cart.appliedCoupons,
      freeShippingThreshold: 999,
      freeShippingEligible: cart.totals.subtotal >= 999
    };

    res.json({
      success: true,
      data: {
        summary
      }
    });
  } catch (error) {
    console.error('Get cart summary error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching cart summary' }
    });
  }
};

// @desc    Merge guest cart with user cart (for login/registration)
// @route   POST /api/cart/merge
// @access  Private
const mergeGuestCart = async (req, res) => {
  try {
    const { guestCartItems } = req.body;

    if (!guestCartItems || !Array.isArray(guestCartItems)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid guest cart data' }
      });
    }

    // Merge guest cart with user cart
    const cart = await Cart.mergeGuestCart(req.user._id, guestCartItems);

    res.json({
      success: true,
      message: 'Guest cart merged successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    console.error('Merge guest cart error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while merging guest cart' }
    });
  }
};

// @desc    Validate cart items (check availability and prices)
// @route   POST /api/cart/validate
// @access  Private
const validateCart = async (req, res) => {
  try {
    const cart = await Cart.findByUser(req.user._id);
    
    if (!cart || cart.items.length === 0) {
      return res.json({
        success: true,
        data: {
          isValid: true,
          issues: [],
          cart: cart || { items: [], totals: { total: 0 } }
        }
      });
    }

    const issues = [];
    const validItems = [];

    // Check each cart item
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      
      if (!product || !product.isActive) {
        issues.push({
          type: 'unavailable',
          productId: item.product,
          size: item.size,
          message: 'Product is no longer available'
        });
        continue;
      }

      // Check if size is still available
      if (!product.isSizeAvailable(item.size, item.quantity)) {
        const sizeInfo = product.sizes.find(s => s.size === item.size);
        const availableStock = sizeInfo ? sizeInfo.stock - sizeInfo.reserved : 0;
        
        issues.push({
          type: 'insufficient_stock',
          productId: item.product,
          size: item.size,
          requestedQuantity: item.quantity,
          availableQuantity: availableStock,
          message: `Only ${availableStock} items available for size ${item.size}`
        });
        
        // Adjust quantity to available stock
        if (availableStock > 0) {
          item.quantity = availableStock;
          validItems.push(item);
        }
      } else {
        // Check if price has changed
        if (item.price !== product.currentPrice) {
          issues.push({
            type: 'price_change',
            productId: item.product,
            size: item.size,
            oldPrice: item.price,
            newPrice: product.currentPrice,
            message: `Price has changed from ₹${item.price} to ₹${product.currentPrice}`
          });
          
          // Update price
          item.price = product.currentPrice;
        }
        
        validItems.push(item);
      }
    }

    // Update cart with valid items if there were changes
    if (issues.length > 0) {
      cart.items = validItems;
      await cart.save();
    }

    res.json({
      success: true,
      data: {
        isValid: issues.length === 0,
        issues,
        cart
      }
    });
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while validating cart' }
    });
  }
};

// @desc    Update shipping address for cart
// @route   PUT /api/cart/shipping-address
// @access  Private
const updateShippingAddress = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        error: { message: 'Shipping address is required' }
      });
    }

    const cart = await Cart.findByUser(req.user._id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cart not found' }
      });
    }

    // Update shipping address
    cart.shippingAddress = shippingAddress;
    await cart.save();

    res.json({
      success: true,
      message: 'Shipping address updated successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    console.error('Update shipping address error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while updating shipping address' }
    });
  }
};

module.exports = {
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
};