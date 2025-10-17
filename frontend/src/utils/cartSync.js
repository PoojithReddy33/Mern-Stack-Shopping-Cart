// Cart synchronization utilities for optimistic updates and server reconciliation

import { cartAPI } from '../services/api';
import { createErrorObject, ErrorTypes } from './errorHandler';

// Cart synchronization state
export const SyncState = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  CONFLICT: 'conflict',
  ERROR: 'error',
  OFFLINE: 'offline'
};

// Cart operation types for optimistic updates
export const CartOperationType = {
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_CART: 'CLEAR_CART'
};

// Pending operation structure
export class PendingOperation {
  constructor(type, payload, timestamp = Date.now()) {
    this.id = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.payload = payload;
    this.timestamp = timestamp;
    this.attempts = 0;
    this.maxAttempts = 3;
  }
}

// Cart synchronization manager
export class CartSyncManager {
  constructor() {
    this.pendingOperations = [];
    this.syncState = SyncState.IDLE;
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.conflictResolver = null;
  }

  // Add pending operation for later sync
  addPendingOperation(type, payload) {
    const operation = new PendingOperation(type, payload);
    this.pendingOperations.push(operation);
    console.log(`📝 Added pending operation: ${type}`, operation);
    return operation.id;
  }

  // Remove pending operation
  removePendingOperation(operationId) {
    const index = this.pendingOperations.findIndex(op => op.id === operationId);
    if (index !== -1) {
      const removed = this.pendingOperations.splice(index, 1)[0];
      console.log(`✅ Removed pending operation: ${removed.type}`, removed);
      return removed;
    }
    return null;
  }

  // Get pending operations
  getPendingOperations() {
    return [...this.pendingOperations];
  }

  // Clear all pending operations
  clearPendingOperations() {
    const count = this.pendingOperations.length;
    this.pendingOperations = [];
    console.log(`🗑️ Cleared ${count} pending operations`);
  }

  // Apply optimistic update to local state
  applyOptimisticUpdate(currentItems, operation) {
    const { type, payload } = operation;
    
    switch (type) {
      case CartOperationType.ADD_ITEM: {
        const { productId, size, quantity } = payload;
        const existingIndex = currentItems.findIndex(
          item => item.productId === productId && item.size === size
        );
        
        if (existingIndex >= 0) {
          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + quantity
          };
          return updatedItems;
        } else {
          return [...currentItems, payload];
        }
      }
      
      case CartOperationType.UPDATE_ITEM: {
        const { productId, size, quantity } = payload;
        return currentItems.map(item =>
          item.productId === productId && item.size === size
            ? { ...item, quantity }
            : item
        );
      }
      
      case CartOperationType.REMOVE_ITEM: {
        const { productId, size } = payload;
        return currentItems.filter(
          item => !(item.productId === productId && item.size === size)
        );
      }
      
      case CartOperationType.CLEAR_CART: {
        return [];
      }
      
      default:
        console.warn(`Unknown operation type: ${type}`);
        return currentItems;
    }
  }

  // Reconcile local state with server state
  reconcileWithServer(localItems, serverItems) {
    const conflicts = [];
    const reconciled = [...serverItems];
    
    // Check for conflicts between local and server state
    localItems.forEach(localItem => {
      const serverItem = serverItems.find(
        item => item.productId === localItem.productId && item.size === localItem.size
      );
      
      if (serverItem) {
        // Item exists on both sides - check for conflicts
        if (serverItem.quantity !== localItem.quantity) {
          conflicts.push({
            type: 'quantity_mismatch',
            productId: localItem.productId,
            size: localItem.size,
            localQuantity: localItem.quantity,
            serverQuantity: serverItem.quantity,
            localItem,
            serverItem
          });
        }
        
        if (Math.abs(serverItem.price - localItem.price) > 0.01) {
          conflicts.push({
            type: 'price_mismatch',
            productId: localItem.productId,
            size: localItem.size,
            localPrice: localItem.price,
            serverPrice: serverItem.price,
            localItem,
            serverItem
          });
        }
      } else {
        // Item exists locally but not on server - add to server
        reconciled.push(localItem);
      }
    });
    
    return {
      reconciledItems: reconciled,
      conflicts,
      hasConflicts: conflicts.length > 0
    };
  }

  // Sync pending operations with server
  async syncWithServer(currentItems, isAuthenticated) {
    if (!isAuthenticated || this.syncInProgress) {
      return { success: false, reason: 'not_authenticated_or_syncing' };
    }

    if (this.pendingOperations.length === 0) {
      return { success: true, reason: 'no_pending_operations' };
    }

    this.syncInProgress = true;
    this.syncState = SyncState.SYNCING;
    
    console.log(`🔄 Starting sync of ${this.pendingOperations.length} pending operations`);
    
    const results = [];
    const failedOperations = [];
    
    // Process pending operations in order
    for (const operation of [...this.pendingOperations]) {
      try {
        operation.attempts++;
        
        const result = await this.executePendingOperation(operation);
        results.push({ operation, result, success: true });
        
        // Remove successful operation
        this.removePendingOperation(operation.id);
        
      } catch (error) {
        console.error(`❌ Failed to sync operation ${operation.type}:`, error);
        
        const errorObj = createErrorObject(error, {
          operation: operation.type,
          payload: operation.payload,
          attempt: operation.attempts
        });
        
        results.push({ operation, error: errorObj, success: false });
        
        // Check if we should retry or give up
        if (operation.attempts >= operation.maxAttempts) {
          console.warn(`🚫 Giving up on operation after ${operation.attempts} attempts`);
          this.removePendingOperation(operation.id);
          failedOperations.push(operation);
        } else if (errorObj.type === ErrorTypes.NETWORK_ERROR) {
          // Keep for retry on network errors
          console.log(`🔄 Will retry operation ${operation.type} (attempt ${operation.attempts}/${operation.maxAttempts})`);
        } else {
          // Remove non-retryable errors
          console.warn(`🚫 Removing non-retryable operation: ${errorObj.type}`);
          this.removePendingOperation(operation.id);
          failedOperations.push(operation);
        }
      }
    }
    
    this.syncInProgress = false;
    this.syncState = this.pendingOperations.length > 0 ? SyncState.ERROR : SyncState.IDLE;
    this.lastSyncTime = new Date();
    
    console.log(`✅ Sync complete. ${results.filter(r => r.success).length}/${results.length} operations succeeded`);
    
    return {
      success: failedOperations.length === 0,
      results,
      failedOperations,
      remainingOperations: this.pendingOperations.length
    };
  }

  // Execute a single pending operation
  async executePendingOperation(operation) {
    const { type, payload } = operation;
    
    switch (type) {
      case CartOperationType.ADD_ITEM:
        return await cartAPI.addToCart(payload);
        
      case CartOperationType.UPDATE_ITEM:
        return await cartAPI.updateCartItem(payload);
        
      case CartOperationType.REMOVE_ITEM:
        return await cartAPI.removeFromCart(payload.productId, payload.size);
        
      case CartOperationType.CLEAR_CART:
        return await cartAPI.clearCart();
        
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      state: this.syncState,
      pendingCount: this.pendingOperations.length,
      lastSyncTime: this.lastSyncTime,
      inProgress: this.syncInProgress
    };
  }

  // Set conflict resolver function
  setConflictResolver(resolver) {
    this.conflictResolver = resolver;
  }

  // Resolve conflicts using the configured resolver
  async resolveConflicts(conflicts) {
    if (!this.conflictResolver) {
      console.warn('No conflict resolver configured, using default resolution');
      return this.defaultConflictResolution(conflicts);
    }
    
    return await this.conflictResolver(conflicts);
  }

  // Default conflict resolution (server wins)
  defaultConflictResolution(conflicts) {
    console.log('Using default conflict resolution (server wins)');
    return conflicts.map(conflict => ({
      ...conflict,
      resolution: 'server_wins',
      resolvedValue: conflict.serverItem
    }));
  }
}

// Global cart sync manager instance
export const cartSyncManager = new CartSyncManager();

// Utility functions for cart validation
export const validateCartItems = (items) => {
  const errors = [];
  
  items.forEach((item, index) => {
    if (!item.productId) {
      errors.push(`Item ${index}: Missing productId`);
    }
    
    if (!item.size) {
      errors.push(`Item ${index}: Missing size`);
    }
    
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index}: Invalid quantity (${item.quantity})`);
    }
    
    if (!item.price || item.price <= 0) {
      errors.push(`Item ${index}: Invalid price (${item.price})`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Calculate cart totals
export const calculateCartTotals = (items) => {
  const subtotal = items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  const tax = subtotal * 0.18; // 18% GST
  const shipping = subtotal > 500 ? 0 : 50; // Free shipping above ₹500
  const total = subtotal + tax + shipping;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping,
    total: Math.round(total * 100) / 100,
    itemCount: items.reduce((count, item) => count + item.quantity, 0)
  };
};

// Compare cart states for changes
export const compareCartStates = (oldItems, newItems) => {
  if (oldItems.length !== newItems.length) {
    return { hasChanges: true, type: 'item_count_changed' };
  }
  
  for (let i = 0; i < oldItems.length; i++) {
    const oldItem = oldItems[i];
    const newItem = newItems.find(
      item => item.productId === oldItem.productId && item.size === oldItem.size
    );
    
    if (!newItem) {
      return { hasChanges: true, type: 'item_removed' };
    }
    
    if (oldItem.quantity !== newItem.quantity) {
      return { hasChanges: true, type: 'quantity_changed' };
    }
    
    if (Math.abs(oldItem.price - newItem.price) > 0.01) {
      return { hasChanges: true, type: 'price_changed' };
    }
  }
  
  return { hasChanges: false };
};