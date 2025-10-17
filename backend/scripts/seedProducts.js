const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

const sampleProducts = [
  {
    name: 'Classic Cotton T-Shirt',
    seo: {
      slug: 'classic-cotton-t-shirt'
    },
    description: 'A comfortable and versatile cotton t-shirt perfect for everyday wear. Made from 100% premium cotton with a relaxed fit.',
    shortDescription: 'Comfortable cotton t-shirt for everyday wear',
    category: 'shirts',
    subcategory: 't-shirts',
    brand: 'StyleCo',
    price: {
      original: 899,
      discounted: 699
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        alt: 'Classic Cotton T-Shirt - Front View',
        isPrimary: true
      }
    ],
    sizes: [
      { size: 'S', stock: 10, reserved: 0 },
      { size: 'M', stock: 15, reserved: 0 },
      { size: 'L', stock: 12, reserved: 0 },
      { size: 'XL', stock: 8, reserved: 0 }
    ],
    colors: [
      { name: 'White', hexCode: '#FFFFFF' },
      { name: 'Black', hexCode: '#000000' },
      { name: 'Navy', hexCode: '#000080' }
    ],
    material: '100% Cotton',
    careInstructions: ['Machine wash cold', 'Tumble dry low', 'Do not bleach'],
    features: ['Comfortable fit', 'Breathable fabric', 'Durable construction'],
    tags: ['casual', 'cotton', 'basic', 'everyday'],
    isFeatured: true
  },
  {
    name: 'Slim Fit Denim Jeans',
    seo: {
      slug: 'slim-fit-denim-jeans'
    },
    description: 'Modern slim-fit jeans crafted from premium denim. Features a contemporary cut with comfortable stretch for all-day wear.',
    shortDescription: 'Slim-fit denim jeans with stretch comfort',
    category: 'jeans',
    brand: 'DenimCraft',
    price: {
      original: 2499,
      discounted: 1999
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500',
        alt: 'Slim Fit Denim Jeans',
        isPrimary: true
      }
    ],
    sizes: [
      { size: '30', stock: 8, reserved: 0 },
      { size: '32', stock: 12, reserved: 0 },
      { size: '34', stock: 10, reserved: 0 },
      { size: '36', stock: 6, reserved: 0 }
    ],
    colors: [
      { name: 'Dark Blue', hexCode: '#1e3a8a' },
      { name: 'Light Blue', hexCode: '#3b82f6' }
    ],
    material: '98% Cotton, 2% Elastane',
    careInstructions: ['Machine wash cold', 'Hang dry', 'Iron on low heat'],
    features: ['Slim fit', 'Stretch comfort', 'Five-pocket design'],
    tags: ['denim', 'jeans', 'slim-fit', 'stretch'],
    isFeatured: true
  },
  {
    name: 'Casual Button-Down Shirt',
    seo: {
      slug: 'casual-button-down-shirt'
    },
    description: 'A versatile button-down shirt perfect for both casual and semi-formal occasions. Made from soft cotton blend fabric.',
    shortDescription: 'Versatile cotton blend button-down shirt',
    category: 'shirts',
    subcategory: 'casual-shirts',
    brand: 'StyleCo',
    price: {
      original: 1599
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
        alt: 'Casual Button-Down Shirt',
        isPrimary: true
      }
    ],
    sizes: [
      { size: 'S', stock: 6, reserved: 0 },
      { size: 'M', stock: 10, reserved: 0 },
      { size: 'L', stock: 8, reserved: 0 },
      { size: 'XL', stock: 4, reserved: 0 }
    ],
    colors: [
      { name: 'White', hexCode: '#FFFFFF' },
      { name: 'Light Blue', hexCode: '#3b82f6' },
      { name: 'Gray', hexCode: '#6b7280' }
    ],
    material: '60% Cotton, 40% Polyester',
    careInstructions: ['Machine wash warm', 'Tumble dry medium', 'Iron as needed'],
    features: ['Button-down collar', 'Chest pocket', 'Regular fit'],
    tags: ['casual', 'shirt', 'button-down', 'versatile']
  },
  {
    name: 'Hooded Sweatshirt',
    seo: {
      slug: 'hooded-sweatshirt'
    },
    description: 'Comfortable hooded sweatshirt perfect for cooler weather. Features a kangaroo pocket and adjustable drawstring hood.',
    shortDescription: 'Comfortable hooded sweatshirt with kangaroo pocket',
    category: 'hoodies',
    brand: 'ComfortWear',
    price: {
      original: 1899,
      discounted: 1499
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500',
        alt: 'Hooded Sweatshirt',
        isPrimary: true
      }
    ],
    sizes: [
      { size: 'S', stock: 5, reserved: 0 },
      { size: 'M', stock: 8, reserved: 0 },
      { size: 'L', stock: 10, reserved: 0 },
      { size: 'XL', stock: 6, reserved: 0 }
    ],
    colors: [
      { name: 'Gray', hexCode: '#6b7280' },
      { name: 'Black', hexCode: '#000000' },
      { name: 'Navy', hexCode: '#000080' }
    ],
    material: '80% Cotton, 20% Polyester',
    careInstructions: ['Machine wash cold', 'Tumble dry low', 'Do not iron on print'],
    features: ['Adjustable hood', 'Kangaroo pocket', 'Ribbed cuffs'],
    tags: ['hoodie', 'sweatshirt', 'casual', 'comfort']
  },
  {
    name: 'Chino Pants',
    seo: {
      slug: 'chino-pants'
    },
    description: 'Classic chino pants with a modern fit. Perfect for smart-casual occasions and versatile enough for various styling options.',
    shortDescription: 'Classic chino pants with modern fit',
    category: 'pants',
    subcategory: 'chinos',
    brand: 'StyleCo',
    price: {
      original: 1799
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500',
        alt: 'Chino Pants',
        isPrimary: true
      }
    ],
    sizes: [
      { size: '30', stock: 7, reserved: 0 },
      { size: '32', stock: 9, reserved: 0 },
      { size: '34', stock: 8, reserved: 0 },
      { size: '36', stock: 5, reserved: 0 }
    ],
    colors: [
      { name: 'Khaki', hexCode: '#c3b091' },
      { name: 'Navy', hexCode: '#000080' },
      { name: 'Black', hexCode: '#000000' }
    ],
    material: '97% Cotton, 3% Elastane',
    careInstructions: ['Machine wash cold', 'Hang dry', 'Iron on medium heat'],
    features: ['Slim fit', 'Four-pocket design', 'Belt loops'],
    tags: ['chinos', 'pants', 'smart-casual', 'versatile'],
    isFeatured: true
  }
];

const seedProducts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert sample products
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`Created ${createdProducts.length} sample products`);

    console.log('Sample products:');
    createdProducts.forEach(product => {
      console.log(`- ${product.name} (${product.category}) - ₹${product.currentPrice}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
};

seedProducts();