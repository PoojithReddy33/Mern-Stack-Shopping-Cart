const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Maximum quantity per item is 10']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for item subtotal
cartItemSchema.virtual('subtotal').get(function() {
  return this.quantity * this.price;
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  items: [cartItemSchema],
  totals: {
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    shipping: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    total: {
      type: Number,
      default: 0,
      min: [0, 'Total cannot be negative']
    }
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  appliedCoupons: [{
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    discount: {
      type: Number,
      min: [0, 'Coupon discount cannot be negative']
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  sessionId: {
    type: String,
    sparse: true // Allow null values but ensure uniqueness when present
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total items count
cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for unique items count
cartSchema.virtual('uniqueItemCount').get(function() {
  return this.items.length;
});

// Indexes
cartSchema.index({ user: 1 });
cartSchema.index({ sessionId: 1 });
cartSchema.index({ isActive: 1 });
cartSchema.index({ lastModified: 1 });

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  this.calculateTotals();
  this.lastModified = new Date();
  next();
});

// Instance method to calculate totals
cartSchema.methods.calculateTotals = function() {
  // Calculate subtotal
  this.totals.subtotal = this.items.reduce((total, item) => {
    return total + (item.quantity * item.price);
  }, 0);

  // Calculate tax (18% GST for India)
  const taxRate = 0.18;
  this.totals.tax = Math.round(this.totals.subtotal * taxRate * 100) / 100;

  // Calculate shipping (free for orders above ₹999, otherwise ₹99)
  const freeShippingThreshold = 999;
  const shippingCost = 99;
  this.totals.shipping = this.totals.subtotal >= freeShippingThreshold ? 0 : shippingCost;

  // Apply coupon discounts
  this.totals.discount = this.appliedCoupons.reduce((total, coupon) => {
    return total + coupon.discount;
  }, 0);

  // Calculate final total
  this.totals.total = Math.max(0, 
    this.totals.subtotal + 
    this.totals.tax + 
    this.totals.shipping - 
    this.totals.discount
  );

  return this.totals;
};

// Instance method to add item to cart
cartSchema.methods.addItem = function(productId, size, quantity, price) {
  // Check if item already exists
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString() && item.size === size
  );

  if (existingItemIndex >= 0) {
    // Update existing item quantity
    const newQuantity = this.items[existingItemIndex].quantity + quantity;
    if (newQuantity > 10) {
      throw new Error('Maximum quantity per item is 10');
    }
    this.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    this.items.push({
      product: productId,
      size,
      quantity,
      price
    });
  }

  return this.save();
};

// Instance method to update item quantity
cartSchema.methods.updateItemQuantity = function(productId, size, quantity) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString() && item.size === size
  );

  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }

  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    this.items.splice(itemIndex, 1);
  } else if (quantity > 10) {
    throw new Error('Maximum quantity per item is 10');
  } else {
    this.items[itemIndex].quantity = quantity;
  }

  return this.save();
};

// Instance method to remove item from cart
cartSchema.methods.removeItem = function(productId, size) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString() && item.size === size
  );

  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }

  this.items.splice(itemIndex, 1);
  return this.save();
};

// Instance method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.appliedCoupons = [];
  return this.save();
};

// Instance method to apply coupon
cartSchema.methods.applyCoupon = function(couponCode, discountAmount) {
  // Check if coupon already applied
  const existingCoupon = this.appliedCoupons.find(coupon => coupon.code === couponCode);
  if (existingCoupon) {
    throw new Error('Coupon already applied');
  }

  this.appliedCoupons.push({
    code: couponCode,
    discount: discountAmount
  });

  return this.save();
};

// Instance method to remove coupon
cartSchema.methods.removeCoupon = function(couponCode) {
  const couponIndex = this.appliedCoupons.findIndex(coupon => coupon.code === couponCode);
  if (couponIndex === -1) {
    throw new Error('Coupon not found');
  }

  this.appliedCoupons.splice(couponIndex, 1);
  return this.save();
};

// Static method to find cart by user
cartSchema.statics.findByUser = function(userId) {
  return this.findOne({ user: userId, isActive: true }).populate('items.product');
};

// Static method to find cart by session
cartSchema.statics.findBySession = function(sessionId) {
  return this.findOne({ sessionId, isActive: true }).populate('items.product');
};

// Static method to merge guest cart with user cart
cartSchema.statics.mergeGuestCart = async function(userId, guestCartItems) {
  let userCart = await this.findByUser(userId);
  
  if (!userCart) {
    // Create new cart for user
    userCart = new this({ user: userId, items: [] });
  }

  // Add guest cart items to user cart
  for (const guestItem of guestCartItems) {
    try {
      await userCart.addItem(
        guestItem.productId, 
        guestItem.size, 
        guestItem.quantity, 
        guestItem.price
      );
    } catch (error) {
      // Skip items that can't be added (e.g., exceed max quantity)
      console.warn(`Could not merge item: ${error.message}`);
    }
  }

  return userCart;
};

module.exports = mongoose.model('Cart', cartSchema);