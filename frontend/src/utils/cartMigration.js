/**
 * Utility functions for cart migration between guest and authenticated users
 */

/**
 * Get guest cart items from localStorage
 * @returns {Array} Array of cart items
 */
export const getGuestCartItems = () => {
  try {
    const cartData = localStorage.getItem('cart');
    return cartData ? JSON.parse(cartData) : [];
  } catch (error) {
    console.error('Error parsing guest cart data:', error);
    return [];
  }
};

/**
 * Clear guest cart data from localStorage
 */
export const clearGuestCart = () => {
  localStorage.removeItem('cart');
  localStorage.removeItem('pendingCartMigration');
};

/**
 * Check if there are items to migrate
 * @returns {boolean} True if there are items to migrate
 */
export const hasItemsToMigrate = () => {
  const guestCart = getGuestCartItems();
  const pendingMigration = localStorage.getItem('pendingCartMigration');
  return guestCart.length > 0 || !!pendingMigration;
};

/**
 * Get the total number of items in guest cart
 * @returns {number} Total quantity of items
 */
export const getGuestCartItemCount = () => {
  const items = getGuestCartItems();
  return items.reduce((total, item) => total + (item.quantity || 0), 0);
};

/**
 * Validate cart item structure
 * @param {Object} item - Cart item to validate
 * @returns {boolean} True if item is valid
 */
export const isValidCartItem = (item) => {
  return (
    item &&
    typeof item === 'object' &&
    item.productId &&
    item.size &&
    typeof item.quantity === 'number' &&
    item.quantity > 0 &&
    typeof item.price === 'number' &&
    item.price > 0
  );
};

/**
 * Clean and validate guest cart items
 * @param {Array} items - Array of cart items
 * @returns {Array} Array of valid cart items
 */
export const cleanCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  
  return items.filter(isValidCartItem).map(item => ({
    productId: item.productId,
    size: item.size,
    quantity: Math.max(1, Math.floor(item.quantity)),
    price: Math.max(0, item.price),
    color: item.color || null
  }));
};