/**
 * Enhanced utility functions for cart migration between guest and authenticated users
 * Includes conflict resolution, validation, and rollback capabilities
 */

import { createErrorObject, ErrorTypes } from './errorHandler';
import { validateCartItems, calculateCartTotals } from './cartSync';

// Migration status constants
export const MigrationStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back'
};

// Conflict resolution strategies
export const ConflictResolution = {
  GUEST_WINS: 'guest_wins',           // Use guest cart values
  SERVER_WINS: 'server_wins',         // Use server cart values
  MERGE_QUANTITIES: 'merge_quantities', // Add quantities together
  KEEP_LATEST: 'keep_latest',         // Use most recently updated
  ASK_USER: 'ask_user'                // Prompt user to decide
};

// Migration result structure
export class MigrationResult {
  constructor() {
    this.success = false;
    this.status = MigrationStatus.PENDING;
    this.migratedItems = [];
    this.conflicts = [];
    this.errors = [];
    this.rollbackData = null;
    this.statistics = {
      totalItems: 0,
      migratedItems: 0,
      conflictItems: 0,
      failedItems: 0,
      startTime: null,
      endTime: null,
      duration: 0
    };
  }

  setSuccess(success) {
    this.success = success;
    this.status = success ? MigrationStatus.COMPLETED : MigrationStatus.FAILED;
    this.statistics.endTime = new Date();
    this.statistics.duration = this.statistics.endTime - this.statistics.startTime;
  }

  addConflict(conflict) {
    this.conflicts.push(conflict);
    this.statistics.conflictItems++;
  }

  addError(error) {
    this.errors.push(error);
    this.statistics.failedItems++;
  }
}

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
    color: item.color || null,
    addedAt: item.addedAt || new Date().toISOString()
  }));
};

/**
 * Enhanced cart migration manager
 */
export class CartMigrationManager {
  constructor(cartAPI, conflictResolver = null) {
    this.cartAPI = cartAPI;
    this.conflictResolver = conflictResolver;
    this.migrationHistory = [];
  }

  /**
   * Perform complete cart migration with conflict resolution
   * @param {Array} guestItems - Guest cart items
   * @param {Array} serverItems - Server cart items
   * @param {Object} options - Migration options
   * @returns {Promise<MigrationResult>} Migration result
   */
  async migrateCart(guestItems, serverItems = [], options = {}) {
    const result = new MigrationResult();
    result.statistics.startTime = new Date();
    result.status = MigrationStatus.IN_PROGRESS;

    const {
      conflictStrategy = ConflictResolution.MERGE_QUANTITIES,
      validateItems = true,
      createBackup = true,
      dryRun = false
    } = options;

    try {
      console.log(`🔄 Starting cart migration: ${guestItems.length} guest items, ${serverItems.length} server items`);

      // Step 1: Validate guest items
      if (validateItems) {
        const validation = validateCartItems(guestItems);
        if (!validation.isValid) {
          throw new Error(`Guest cart validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Step 2: Create backup of current server cart
      if (createBackup && !dryRun) {
        result.rollbackData = {
          serverItems: [...serverItems],
          timestamp: new Date().toISOString()
        };
      }

      // Step 3: Detect conflicts
      const conflicts = this.detectConflicts(guestItems, serverItems);
      result.statistics.totalItems = guestItems.length;

      if (conflicts.length > 0) {
        console.log(`⚠️ Found ${conflicts.length} conflicts during migration`);
        
        // Resolve conflicts
        const resolvedConflicts = await this.resolveConflicts(conflicts, conflictStrategy);
        result.conflicts = resolvedConflicts;
      }

      // Step 4: Merge carts
      const mergedItems = this.mergeCarts(guestItems, serverItems, conflicts, conflictStrategy);
      result.migratedItems = mergedItems;
      result.statistics.migratedItems = mergedItems.length;

      // Step 5: Validate merged cart
      if (validateItems) {
        const mergedValidation = validateCartItems(mergedItems);
        if (!mergedValidation.isValid) {
          throw new Error(`Merged cart validation failed: ${mergedValidation.errors.join(', ')}`);
        }
      }

      // Step 6: Apply migration (if not dry run)
      if (!dryRun) {
        await this.applyMigration(mergedItems);
      }

      result.setSuccess(true);
      console.log(`✅ Cart migration completed successfully: ${result.statistics.migratedItems} items migrated`);

    } catch (error) {
      console.error('❌ Cart migration failed:', error);
      result.addError(createErrorObject(error, { operation: 'cartMigration' }));
      result.setSuccess(false);

      // Attempt rollback if we have backup data
      if (result.rollbackData && !dryRun) {
        try {
          await this.rollbackMigration(result.rollbackData);
          result.status = MigrationStatus.ROLLED_BACK;
          console.log('🔄 Migration rolled back successfully');
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError);
          result.addError(createErrorObject(rollbackError, { operation: 'rollback' }));
        }
      }
    }

    // Store migration history
    this.migrationHistory.push({
      timestamp: new Date().toISOString(),
      result: { ...result },
      options
    });

    return result;
  }

  /**
   * Detect conflicts between guest and server carts
   * @param {Array} guestItems - Guest cart items
   * @param {Array} serverItems - Server cart items
   * @returns {Array} Array of conflicts
   */
  detectConflicts(guestItems, serverItems) {
    const conflicts = [];

    guestItems.forEach(guestItem => {
      const serverItem = serverItems.find(
        item => item.productId === guestItem.productId && item.size === guestItem.size
      );

      if (serverItem) {
        const conflict = {
          type: 'item_exists',
          productId: guestItem.productId,
          size: guestItem.size,
          guestItem,
          serverItem,
          differences: []
        };

        // Check for quantity differences
        if (guestItem.quantity !== serverItem.quantity) {
          conflict.differences.push({
            field: 'quantity',
            guestValue: guestItem.quantity,
            serverValue: serverItem.quantity
          });
        }

        // Check for price differences
        if (Math.abs(guestItem.price - serverItem.price) > 0.01) {
          conflict.differences.push({
            field: 'price',
            guestValue: guestItem.price,
            serverValue: serverItem.price
          });
        }

        // Check for color differences
        if (guestItem.color !== serverItem.color) {
          conflict.differences.push({
            field: 'color',
            guestValue: guestItem.color,
            serverValue: serverItem.color
          });
        }

        if (conflict.differences.length > 0) {
          conflicts.push(conflict);
        }
      }
    });

    return conflicts;
  }

  /**
   * Resolve conflicts using specified strategy
   * @param {Array} conflicts - Array of conflicts
   * @param {string} strategy - Conflict resolution strategy
   * @returns {Promise<Array>} Resolved conflicts
   */
  async resolveConflicts(conflicts, strategy) {
    const resolvedConflicts = [];

    for (const conflict of conflicts) {
      const resolved = { ...conflict, resolution: null, resolvedItem: null };

      switch (strategy) {
        case ConflictResolution.GUEST_WINS:
          resolved.resolution = 'guest_wins';
          resolved.resolvedItem = conflict.guestItem;
          break;

        case ConflictResolution.SERVER_WINS:
          resolved.resolution = 'server_wins';
          resolved.resolvedItem = conflict.serverItem;
          break;

        case ConflictResolution.MERGE_QUANTITIES:
          resolved.resolution = 'merge_quantities';
          resolved.resolvedItem = {
            ...conflict.serverItem,
            quantity: conflict.guestItem.quantity + conflict.serverItem.quantity,
            // Use more recent price
            price: conflict.guestItem.addedAt > conflict.serverItem.addedAt 
              ? conflict.guestItem.price 
              : conflict.serverItem.price
          };
          break;

        case ConflictResolution.KEEP_LATEST:
          resolved.resolution = 'keep_latest';
          const isGuestNewer = new Date(conflict.guestItem.addedAt) > new Date(conflict.serverItem.addedAt);
          resolved.resolvedItem = isGuestNewer ? conflict.guestItem : conflict.serverItem;
          break;

        case ConflictResolution.ASK_USER:
          if (this.conflictResolver) {
            resolved.resolvedItem = await this.conflictResolver(conflict);
            resolved.resolution = 'user_decided';
          } else {
            // Fallback to merge quantities if no resolver
            resolved.resolution = 'merge_quantities_fallback';
            resolved.resolvedItem = {
              ...conflict.serverItem,
              quantity: conflict.guestItem.quantity + conflict.serverItem.quantity
            };
          }
          break;

        default:
          throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
      }

      resolvedConflicts.push(resolved);
    }

    return resolvedConflicts;
  }

  /**
   * Merge guest and server carts
   * @param {Array} guestItems - Guest cart items
   * @param {Array} serverItems - Server cart items
   * @param {Array} conflicts - Detected conflicts
   * @param {string} strategy - Resolution strategy
   * @returns {Array} Merged cart items
   */
  mergeCarts(guestItems, serverItems, conflicts, strategy) {
    const mergedItems = [...serverItems];
    const conflictMap = new Map();

    // Create map of conflicts for quick lookup
    conflicts.forEach(conflict => {
      const key = `${conflict.productId}_${conflict.size}`;
      conflictMap.set(key, conflict);
    });

    // Process guest items
    guestItems.forEach(guestItem => {
      const key = `${guestItem.productId}_${guestItem.size}`;
      const conflict = conflictMap.get(key);

      if (conflict && conflict.resolvedItem) {
        // Replace server item with resolved item
        const serverIndex = mergedItems.findIndex(
          item => item.productId === guestItem.productId && item.size === guestItem.size
        );
        if (serverIndex !== -1) {
          mergedItems[serverIndex] = conflict.resolvedItem;
        }
      } else if (!conflict) {
        // No conflict, add guest item
        mergedItems.push(guestItem);
      }
    });

    return mergedItems;
  }

  /**
   * Apply migration to server
   * @param {Array} mergedItems - Merged cart items
   * @returns {Promise<void>}
   */
  async applyMigration(mergedItems) {
    try {
      // Clear existing cart
      await this.cartAPI.clearCart();

      // Add merged items
      for (const item of mergedItems) {
        await this.cartAPI.addToCart({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          color: item.color
        });
      }

      console.log(`✅ Applied migration: ${mergedItems.length} items added to server cart`);
    } catch (error) {
      console.error('❌ Failed to apply migration:', error);
      throw error;
    }
  }

  /**
   * Rollback migration
   * @param {Object} rollbackData - Backup data for rollback
   * @returns {Promise<void>}
   */
  async rollbackMigration(rollbackData) {
    try {
      console.log('🔄 Rolling back cart migration...');

      // Clear current cart
      await this.cartAPI.clearCart();

      // Restore original server items
      for (const item of rollbackData.serverItems) {
        await this.cartAPI.addToCart({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          color: item.color
        });
      }

      console.log(`✅ Rollback completed: ${rollbackData.serverItems.length} items restored`);
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Get migration history
   * @returns {Array} Migration history
   */
  getMigrationHistory() {
    return [...this.migrationHistory];
  }

  /**
   * Clear migration history
   */
  clearMigrationHistory() {
    this.migrationHistory = [];
  }

  /**
   * Set conflict resolver function
   * @param {Function} resolver - Conflict resolver function
   */
  setConflictResolver(resolver) {
    this.conflictResolver = resolver;
  }
}

/**
 * Create a default migration manager instance
 * @param {Object} cartAPI - Cart API instance
 * @returns {CartMigrationManager} Migration manager
 */
export const createMigrationManager = (cartAPI) => {
  return new CartMigrationManager(cartAPI);
};

/**
 * Perform quick migration with default settings
 * @param {Object} cartAPI - Cart API instance
 * @param {Array} guestItems - Guest cart items
 * @param {Array} serverItems - Server cart items
 * @param {Object} options - Migration options
 * @returns {Promise<MigrationResult>} Migration result
 */
export const quickMigration = async (cartAPI, guestItems, serverItems = [], options = {}) => {
  const manager = createMigrationManager(cartAPI);
  return await manager.migrateCart(guestItems, serverItems, {
    conflictStrategy: ConflictResolution.MERGE_QUANTITIES,
    validateItems: true,
    createBackup: true,
    ...options
  });
};