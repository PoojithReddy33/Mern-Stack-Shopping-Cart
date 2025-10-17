const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  productSnapshot: {
    name: {
      type: String,
      required: [true, 'Product name is required']
    },
    description: String,
    brand: String,
    category: String,
    images: [{
      url: String,
      alt: String
    }]
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  }
}, {
  _id: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for item subtotal
orderItemSchema.virtual('subtotal').get(function() {
  return this.quantity * this.price;
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: [true, 'Order number is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  items: [orderItemSchema],
  
  // Pricing breakdown
  pricing: {
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      type: Number,
      required: [true, 'Tax amount is required'],
      min: [0, 'Tax cannot be negative']
    },
    shipping: {
      type: Number,
      required: [true, 'Shipping cost is required'],
      min: [0, 'Shipping cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    total: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total cannot be negative']
    }
  },
  
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },

  // Address information
  shippingAddress: {
    firstName: {
      type: String,
      required: [true, 'First name is required']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required']
    },
    country: {
      type: String,
      default: 'India'
    }
  },

  billingAddress: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'India'
    },
    sameAsShipping: {
      type: Boolean,
      default: true
    }
  },

  // Payment information
  payment: {
    method: {
      type: String,
      enum: ['phonepay', 'razorpay', 'paytm', 'upi', 'card', 'netbanking', 'cod'],
      required: [true, 'Payment method is required']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending'
    },
    transactionId: {
      type: String,
      sparse: true // Allow null but ensure uniqueness when present
    },
    paymentGatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    },
    paidAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative']
    }
  },

  // Order status and tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },

  tracking: {
    carrier: String,
    trackingNumber: String,
    trackingUrl: String,
    estimatedDelivery: Date,
    actualDelivery: Date
  },

  // Status history
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Applied coupons and discounts
  appliedCoupons: [{
    code: {
      type: String,
      required: true
    },
    discount: {
      type: Number,
      required: true,
      min: [0, 'Discount cannot be negative']
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed'
    }
  }],

  // Customer notes
  customerNotes: {
    type: String,
    maxlength: [500, 'Customer notes cannot exceed 500 characters']
  },

  // Admin notes (internal)
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },

  // Timestamps for key events
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,

  // Return/refund information
  returnRequest: {
    requested: {
      type: Boolean,
      default: false
    },
    requestedAt: Date,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending'
    },
    refundAmount: Number,
    processedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total items count
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for order age in days
orderSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for full shipping address
orderSchema.virtual('shippingAddress.fullAddress').get(function() {
  const addr = this.shippingAddress;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.postalCode}, ${addr.country}`;
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'payment.transactionId': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ confirmedAt: -1 });
orderSchema.index({ shippedAt: -1 });

// Pre-save middleware to generate order number and update status history
orderSchema.pre('save', function(next) {
  // Generate order number if not exists
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${timestamp.slice(-8)}-${random}`;
  }

  // Add to status history if status changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });

    // Update timestamp fields based on status
    const now = new Date();
    switch (this.status) {
      case 'confirmed':
        if (!this.confirmedAt) this.confirmedAt = now;
        break;
      case 'shipped':
        if (!this.shippedAt) this.shippedAt = now;
        break;
      case 'delivered':
        if (!this.deliveredAt) this.deliveredAt = now;
        break;
      case 'cancelled':
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
    }
  }

  next();
});

// Instance method to update order status
orderSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = null) {
  this.status = newStatus;
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy
  });

  return this.save();
};

// Instance method to add tracking information
orderSchema.methods.addTracking = function(carrier, trackingNumber, trackingUrl = '', estimatedDelivery = null) {
  this.tracking = {
    carrier,
    trackingNumber,
    trackingUrl,
    estimatedDelivery
  };
  
  // Update status to shipped if not already
  if (this.status === 'confirmed' || this.status === 'processing') {
    this.status = 'shipped';
  }

  return this.save();
};

// Instance method to process payment
orderSchema.methods.processPayment = function(transactionId, gatewayResponse = {}) {
  this.payment.status = 'completed';
  this.payment.transactionId = transactionId;
  this.payment.paymentGatewayResponse = gatewayResponse;
  this.payment.paidAt = new Date();
  
  // Update order status to confirmed
  if (this.status === 'pending') {
    this.status = 'confirmed';
  }

  return this.save();
};

// Instance method to initiate return
orderSchema.methods.initiateReturn = function(reason) {
  this.returnRequest = {
    requested: true,
    requestedAt: new Date(),
    reason,
    status: 'pending'
  };

  return this.save();
};

// Static method to find orders by user
orderSchema.statics.findByUser = function(userId, options = {}) {
  const query = { user: userId };
  
  if (options.status) query.status = options.status;
  if (options.paymentStatus) query['payment.status'] = options.paymentStatus;
  
  return this.find(query)
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 });
};

// Static method to find orders by status
orderSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('user', 'profile.firstName profile.lastName email')
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 });
};

// Static method to generate sales report
orderSchema.statics.getSalesReport = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        'payment.status': 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' }
      }
    }
  ]);
};

module.exports = mongoose.model('Order', orderSchema);