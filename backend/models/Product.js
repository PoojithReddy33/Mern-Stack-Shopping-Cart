const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: [
      'shirts',
      'pants',
      'jeans',
      'jackets',
      'sweaters',
      'hoodies',
      'shorts',
      'suits',
      'accessories',
      'shoes',
      'underwear',
      'activewear'
    ],
    lowercase: true
  },
  subcategory: {
    type: String,
    trim: true,
    lowercase: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  price: {
    original: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0, 'Price cannot be negative']
    },
    discounted: {
      type: Number,
      min: [0, 'Discounted price cannot be negative'],
      validate: {
        validator: function(value) {
          return !value || value <= this.price.original;
        },
        message: 'Discounted price cannot be higher than original price'
      }
    }
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  images: [{
    url: {
      type: String,
      required: [true, 'Image URL is required']
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  sizes: [{
    size: {
      type: String,
      required: [true, 'Size is required'],
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42']
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    reserved: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative']
    }
  }],
  colors: [{
    name: {
      type: String,
      required: [true, 'Color name is required'],
      trim: true
    },
    hexCode: {
      type: String,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code']
    }
  }],
  material: {
    type: String,
    trim: true,
    maxlength: [100, 'Material description cannot exceed 100 characters']
  },
  careInstructions: [{
    type: String,
    trim: true
  }],
  features: [{
    type: String,
    trim: true,
    maxlength: [100, 'Feature description cannot exceed 100 characters']
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  availability: {
    status: {
      type: String,
      enum: ['in-stock', 'out-of-stock', 'pre-order', 'discontinued'],
      default: 'in-stock'
    },
    restockDate: {
      type: Date
    }
  },
  seo: {
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    }
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for current price (discounted or original)
productSchema.virtual('currentPrice').get(function() {
  return this.price.discounted || this.price.original;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.price.discounted && this.price.original > this.price.discounted) {
    return Math.round(((this.price.original - this.price.discounted) / this.price.original) * 100);
  }
  return 0;
});

// Virtual for total stock across all sizes
productSchema.virtual('totalStock').get(function() {
  return this.sizes.reduce((total, size) => total + (size.stock - size.reserved), 0);
});

// Virtual for available stock (not reserved)
productSchema.virtual('availableStock').get(function() {
  return this.sizes.reduce((total, size) => total + Math.max(0, size.stock - size.reserved), 0);
});

// Indexes for search and filtering
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ 'price.original': 1 });
productSchema.index({ 'availability.status': 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ 'seo.slug': 1 });
productSchema.index({ createdAt: -1 });

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.seo.slug) {
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Update availability status based on stock
  if (this.isModified('sizes')) {
    const totalAvailable = this.availableStock;
    if (totalAvailable === 0 && this.availability.status === 'in-stock') {
      this.availability.status = 'out-of-stock';
    } else if (totalAvailable > 0 && this.availability.status === 'out-of-stock') {
      this.availability.status = 'in-stock';
    }
  }
  
  next();
});

// Instance method to check if size is available
productSchema.methods.isSizeAvailable = function(size, quantity = 1) {
  const sizeInfo = this.sizes.find(s => s.size === size);
  if (!sizeInfo) return false;
  return (sizeInfo.stock - sizeInfo.reserved) >= quantity;
};

// Instance method to reserve stock
productSchema.methods.reserveStock = function(size, quantity) {
  const sizeInfo = this.sizes.find(s => s.size === size);
  if (!sizeInfo || !this.isSizeAvailable(size, quantity)) {
    throw new Error(`Insufficient stock for size ${size}`);
  }
  sizeInfo.reserved += quantity;
  return this.save();
};

// Instance method to release reserved stock
productSchema.methods.releaseStock = function(size, quantity) {
  const sizeInfo = this.sizes.find(s => s.size === size);
  if (sizeInfo) {
    sizeInfo.reserved = Math.max(0, sizeInfo.reserved - quantity);
  }
  return this.save();
};

// Static method to find products by category
productSchema.statics.findByCategory = function(category, subcategory = null) {
  const query = { category, isActive: true };
  if (subcategory) query.subcategory = subcategory;
  return this.find(query);
};

// Static method to search products
productSchema.statics.searchProducts = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    isActive: true
  };
  
  if (options.category) query.category = options.category;
  if (options.brand) query.brand = options.brand;
  if (options.minPrice || options.maxPrice) {
    query['price.original'] = {};
    if (options.minPrice) query['price.original'].$gte = options.minPrice;
    if (options.maxPrice) query['price.original'].$lte = options.maxPrice;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Product', productSchema);