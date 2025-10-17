import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { cartAPI, TokenManager } from '../services/api';
import { useAuth } from './AuthContext';
import { 
  getGuestCartItems, 
  clearGuestCart, 
  cleanCartItems, 
  createMigrationManager,
  ConflictResolution,
  MigrationStatus 
} from '../utils/cartMigration';
import { showCartError, showSuccessToast, showWarningToast } from '../components/common/ErrorNotification';
import { createErrorObject, ErrorTypes } from '../utils/errorHandler';
import { 
  cartSyncManager, 
  CartOperationType, 
  SyncState,
  validateCartItems,
  calculateCartTotals,
  compareCartStates
} from '../utils/cartSync';
import { 
  offlineQueueManager, 
  createCartOperation, 
  createHighPriorityCartOperation,
  OperationPriority 
} from '../utils/offlineQueue';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_CART':
      return {
        ...state,
        items: action.payload.items || [],
        totalAmount: action.payload.totalAmount || 0,
        loading: false,
      };
    case 'ADD_ITEM':
      const existingItemIndex = state.items.findIndex(
        item => item.productId === action.payload.productId && 
                item.size === action.payload.size
      );
      
      if (existingItemIndex >= 0) {
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex].quantity += action.payload.quantity;
        return {
          ...state,
          items: updatedItems,
        };
      } else {
        return {
          ...state,
          items: [...state.items, action.payload],
        };
      }
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.productId === action.payload.productId && 
          item.size === action.payload.size
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(
          item => !(item.productId === action.payload.productId && 
                   item.size === action.payload.size)
        ),
      };
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        totalAmount: 0,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_OFFLINE_MODE':
      return {
        ...state,
        isOffline: action.payload,
      };
    case 'SET_SYNC_STATE':
      return {
        ...state,
        syncState: action.payload,
      };
    case 'SET_OPTIMISTIC_UPDATE':
      return {
        ...state,
        items: action.payload.items,
        optimisticUpdate: action.payload.operation,
        lastOptimisticUpdate: Date.now(),
      };
    case 'RECONCILE_WITH_SERVER':
      return {
        ...state,
        items: action.payload.items,
        totalAmount: action.payload.totalAmount || 0,
        optimisticUpdate: null,
        lastServerSync: Date.now(),
        loading: false,
      };
    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: action.payload,
      };
    default:
      return state;
  }
};

const initialState = {
  items: JSON.parse(localStorage.getItem('cart')) || [],
  totalAmount: 0,
  loading: false,
  error: null,
  isOffline: false,
  syncState: SyncState.IDLE,
  optimisticUpdate: null,
  lastOptimisticUpdate: null,
  lastServerSync: null,
  validationErrors: null,
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { isAuthenticated } = useAuth();

  // Sync cart with localStorage for guest users
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('cart', JSON.stringify(state.items));
    }
  }, [state.items, isAuthenticated]);

  const loadCartFromServer = useCallback(async () => {
    if (!isAuthenticated) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const validToken = await TokenManager.getValidToken();
      if (!validToken) {
        console.warn('No valid token, cannot load cart from server');
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
        return;
      }

      const response = await cartAPI.getCartWithRetry({ operation: 'loadCart' });
      dispatch({ type: 'SET_CART', payload: response.data.data });
      dispatch({ type: 'SET_OFFLINE_MODE', payload: false });
    } catch (error) {
      console.error('Load cart from server failed:', error);
      
      const errorObj = createErrorObject(error, { operation: 'loadCart' });
      
      if (error.type === ErrorTypes.AUTH_ERROR) {
        console.warn('Authentication failed while loading cart');
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
      } else if (error.type === ErrorTypes.NETWORK_ERROR) {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
        showCartError('NETWORK_ERROR', errorObj);
      } else {
        dispatch({ type: 'SET_ERROR', payload: errorObj });
        showCartError('LOAD_FAILED', errorObj, {
          onRetry: loadCartFromServer
        });
      }
    }
  }, [isAuthenticated]);

  const handleCartMigration = useCallback(async () => {
    if (!isAuthenticated) return;

    // Check for pending cart migration
    const pendingMigration = localStorage.getItem('pendingCartMigration');
    const guestCart = getGuestCartItems();
    
    if (pendingMigration || guestCart.length > 0) {
      const rawItems = pendingMigration ? JSON.parse(pendingMigration) : guestCart;
      const itemsToMigrate = cleanCartItems(rawItems);
      
      if (itemsToMigrate.length === 0) {
        console.log('No valid items to migrate, loading server cart');
        await loadCartFromServer();
        clearGuestCart();
        return;
      }
      
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.SYNCING });
      
      try {
        console.log(`🔄 Starting enhanced cart migration: ${itemsToMigrate.length} items`);
        
        // Load existing server cart
        const serverCartResponse = await cartAPI.getCart();
        const serverItems = serverCartResponse.data.data.items || [];
        
        // Create migration manager
        const migrationManager = createMigrationManager(cartAPI);
        
        // Set up conflict resolver for user prompts (if needed)
        migrationManager.setConflictResolver(async (conflict) => {
          // For now, use merge quantities strategy
          // In a real app, you might show a modal to the user
          return {
            ...conflict.serverItem,
            quantity: conflict.guestItem.quantity + conflict.serverItem.quantity,
            price: conflict.guestItem.price // Use guest price as it's more recent
          };
        });
        
        // Perform migration with conflict resolution
        const migrationResult = await migrationManager.migrateCart(itemsToMigrate, serverItems, {
          conflictStrategy: ConflictResolution.MERGE_QUANTITIES,
          validateItems: true,
          createBackup: true,
          dryRun: false
        });
        
        if (migrationResult.success) {
          console.log(`✅ Cart migration completed successfully`);
          console.log(`📊 Migration stats:`, migrationResult.statistics);
          
          if (migrationResult.conflicts.length > 0) {
            console.log(`⚠️ Resolved ${migrationResult.conflicts.length} conflicts`);
            showWarningToast(`Cart merged successfully. ${migrationResult.conflicts.length} items had conflicts that were resolved.`);
          } else {
            showSuccessToast(`Cart migrated successfully! ${migrationResult.statistics.migratedItems} items added.`);
          }
          
          // Load updated cart from server
          await loadCartFromServer();
          
          // Clean up migration data
          clearGuestCart();
          
        } else {
          console.error('❌ Cart migration failed:', migrationResult.errors);
          
          // Show user-friendly error message
          const errorMessage = migrationResult.errors.length > 0 
            ? migrationResult.errors[0].message 
            : 'Cart migration failed';
          
          showCartError('MIGRATION_FAILED', createErrorObject(new Error(errorMessage)), {
            onRetry: () => handleCartMigration()
          });
          
          // Fallback: try to load server cart and keep guest items in localStorage
          await loadCartFromServer();
          console.log('Guest cart items preserved in localStorage for manual retry');
        }
        
      } catch (error) {
        console.error('Cart migration failed with exception:', error);
        
        const errorObj = createErrorObject(error, { 
          operation: 'cartMigration',
          guestItemCount: itemsToMigrate.length 
        });
        
        dispatch({ type: 'SET_ERROR', payload: errorObj });
        showCartError('MIGRATION_FAILED', errorObj, {
          onRetry: () => handleCartMigration()
        });
        
        // Fallback to loading server cart
        try {
          await loadCartFromServer();
        } catch (loadError) {
          console.error('Failed to load server cart after migration failure:', loadError);
        }
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.IDLE });
      }
    } else {
      // No migration needed, just load server cart
      await loadCartFromServer();
    }
  }, [isAuthenticated, loadCartFromServer]);

  // Load cart from server for authenticated users and handle migration
  useEffect(() => {
    if (isAuthenticated) {
      handleCartMigration();
    }
  }, [isAuthenticated, handleCartMigration]);

  const addToCart = async (productId, size, quantity = 1, price) => {
    const item = { productId, size, quantity, price };
    
    console.log('🛒 Adding to cart:', { productId, size, quantity, price, isAuthenticated });
    
    // Clear any previous errors
    dispatch({ type: 'CLEAR_ERROR' });
    
    // For now, let's use simple logic to debug the issue
    if (isAuthenticated) {
      console.log('👤 User is authenticated, using server cart');
      try {
        // Validate token before making request
        const validToken = await TokenManager.getValidToken();
        if (!validToken) {
          console.warn('No valid token, falling back to guest cart');
          dispatch({ type: 'ADD_ITEM', payload: item });
          showWarningToast('Working offline. Item added to local cart.');
          return;
        }

        // Try to add to server cart
        await cartAPI.addToCartWithRetry(item, { productId, size, quantity });
        
        // Reload cart from server to get updated state
        await loadCartFromServer();
        showSuccessToast('Item added to cart!');
        
      } catch (error) {
        console.error('Add to cart failed:', error);
        
        // Fallback to local cart on any error
        dispatch({ type: 'ADD_ITEM', payload: item });
        showWarningToast('Added to local cart. Will sync when possible.');
      }
    } else {
      console.log('👥 Guest user, using local cart');
      // Guest mode - just update local state
      dispatch({ type: 'ADD_ITEM', payload: item });
      showSuccessToast('Item added to cart!');
    }
  };

  const updateCartItem = async (productId, size, quantity) => {
    dispatch({ type: 'CLEAR_ERROR' });
    
    if (isAuthenticated) {
      // Apply optimistic update immediately
      const operation = { type: CartOperationType.UPDATE_ITEM, payload: { productId, size, quantity } };
      const optimisticItems = cartSyncManager.applyOptimisticUpdate(state.items, operation);
      
      dispatch({ 
        type: 'SET_OPTIMISTIC_UPDATE', 
        payload: { items: optimisticItems, operation } 
      });
      
      try {
        const validToken = await TokenManager.getValidToken();
        if (!validToken) {
          console.warn('No valid token, adding to pending operations');
          cartSyncManager.addPendingOperation(CartOperationType.UPDATE_ITEM, { productId, size, quantity });
          dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
          showWarningToast('Working offline. Changes will sync when online.');
          return;
        }

        dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.SYNCING });
        await cartAPI.updateCartItemWithRetry({ productId, size, quantity }, { productId, size, quantity });
        
        await reconcileWithServer();
        showSuccessToast('Cart updated!');
        
      } catch (error) {
        console.error('Update cart item failed:', error);
        
        const errorObj = createErrorObject(error, { operation: 'updateCartItem', productId, size, quantity });
        
        if (error.type === ErrorTypes.NETWORK_ERROR || error.type === ErrorTypes.AUTH_ERROR) {
          console.warn('Network/Auth error, adding to offline queue');
          
          // Create normal priority operation for cart updates
          const queueOperation = createCartOperation(
            CartOperationType.UPDATE_ITEM, 
            { productId, size, quantity },
            { 
              metadata: { productId, size, quantity, timestamp: Date.now() }
            }
          );
          
          offlineQueueManager.enqueue(queueOperation);
          dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
          dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.OFFLINE });
          
          showCartError('NETWORK_ERROR', errorObj, {
            onRetry: () => processOfflineQueue()
          });
        } else {
          // Revert optimistic update on non-recoverable errors
          dispatch({ type: 'SET_CART', payload: { items: state.items } });
          dispatch({ type: 'SET_ERROR', payload: errorObj });
          dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.ERROR });
          
          showCartError('UPDATE_FAILED', errorObj, {
            onRetry: () => updateCartItem(productId, size, quantity)
          });
        }
      }
    } else {
      dispatch({ type: 'UPDATE_ITEM', payload: { productId, size, quantity } });
      showSuccessToast('Cart updated!');
    }
  };

  const removeFromCart = async (productId, size) => {
    dispatch({ type: 'CLEAR_ERROR' });
    
    if (isAuthenticated) {
      try {
        const validToken = await TokenManager.getValidToken();
        if (!validToken) {
          console.warn('No valid token, falling back to guest cart');
          dispatch({ type: 'REMOVE_ITEM', payload: { productId, size } });
          showWarningToast('Working offline. Item removed from local cart.');
          return;
        }

        await cartAPI.removeFromCartWithRetry(productId, size, { productId, size });
        await loadCartFromServer();
        showSuccessToast('Item removed from cart!');
      } catch (error) {
        console.error('Remove from cart failed:', error);
        
        const errorObj = createErrorObject(error, { operation: 'removeFromCart', productId, size });
        
        if (error.type === ErrorTypes.NETWORK_ERROR || error.type === ErrorTypes.AUTH_ERROR) {
          dispatch({ type: 'REMOVE_ITEM', payload: { productId, size } });
          dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
          
          const updatedItems = state.items.filter(
            item => !(item.productId === productId && item.size === size)
          );
          localStorage.setItem('pendingCartMigration', JSON.stringify(updatedItems));
          
          showCartError('NETWORK_ERROR', errorObj, {
            onRetry: () => removeFromCart(productId, size)
          });
        } else {
          dispatch({ type: 'SET_ERROR', payload: errorObj });
          showCartError('REMOVE_FAILED', errorObj, {
            onRetry: () => removeFromCart(productId, size)
          });
        }
      }
    } else {
      dispatch({ type: 'REMOVE_ITEM', payload: { productId, size } });
      showSuccessToast('Item removed from cart!');
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        // Validate token before making request
        const validToken = await TokenManager.getValidToken();
        if (!validToken) {
          console.warn('No valid token, falling back to guest cart');
          dispatch({ type: 'CLEAR_CART' });
          localStorage.removeItem('cart');
          return;
        }

        await cartAPI.clearCart();
        dispatch({ type: 'CLEAR_CART' });
      } catch (error) {
        console.error('Clear cart failed:', error);
        
        // If it's an auth error, fallback to guest cart
        if (error.response?.status === 401 || error.code === 'NETWORK_ERROR') {
          console.warn('Auth failed or network error, falling back to guest cart');
          dispatch({ type: 'CLEAR_CART' });
          localStorage.removeItem('cart');
          localStorage.removeItem('pendingCartMigration');
        } else {
          dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error?.message || 'Failed to clear cart' });
        }
      }
    } else {
      dispatch({ type: 'CLEAR_CART' });
      localStorage.removeItem('cart');
    }
  };

  const getCartTotal = () => {
    return state.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const getCartItemCount = () => {
    return state.items.reduce((count, item) => count + item.quantity, 0);
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const retryLastOperation = () => {
    if (state.error && state.error.retryable) {
      // This would need to be implemented based on the last operation
      console.log('Retrying last operation...');
      clearError();
    }
  };

  const isItemInCart = (productId, size) => {
    return state.items.some(item => 
      item.productId === productId && item.size === size
    );
  };

  // Reconcile local state with server state
  const reconcileWithServer = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await cartAPI.getCartWithRetry({ operation: 'reconcile' });
      const serverItems = response.data.data.items || [];
      
      // Compare with current local state
      const comparison = compareCartStates(state.items, serverItems);
      
      if (comparison.hasChanges) {
        console.log(`🔄 Cart changes detected: ${comparison.type}`);
        
        // Use server state as source of truth after successful sync
        const totals = calculateCartTotals(serverItems);
        dispatch({ 
          type: 'RECONCILE_WITH_SERVER', 
          payload: { 
            items: serverItems, 
            totalAmount: totals.total 
          } 
        });
        
        dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.IDLE });
        dispatch({ type: 'SET_OFFLINE_MODE', payload: false });
      }
      
    } catch (error) {
      console.error('Failed to reconcile with server:', error);
      dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.ERROR });
      throw error;
    }
  }, [isAuthenticated, state.items]);

  // Sync pending operations with server
  const syncPendingOperations = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.SYNCING });
      
      const result = await cartSyncManager.syncWithServer(state.items, isAuthenticated);
      
      if (result.success) {
        console.log('✅ All pending operations synced successfully');
        await reconcileWithServer();
        showSuccessToast('Cart synced successfully!');
      } else {
        console.warn(`⚠️ Some operations failed to sync: ${result.failedOperations.length}`);
        dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.ERROR });
        
        if (result.remainingOperations > 0) {
          showWarningToast(`${result.remainingOperations} operations pending sync`);
        }
      }
      
    } catch (error) {
      console.error('Failed to sync pending operations:', error);
      dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.ERROR });
      
      const errorObj = createErrorObject(error, { operation: 'syncPendingOperations' });
      showCartError('SYNC_FAILED', errorObj, {
        onRetry: syncPendingOperations
      });
    }
  }, [isAuthenticated, reconcileWithServer, state.items]);

  // Validate current cart state
  const validateCart = useCallback(() => {
    const validation = validateCartItems(state.items);
    
    if (!validation.isValid) {
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: validation.errors });
      console.warn('Cart validation failed:', validation.errors);
      return false;
    }
    
    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: null });
    return true;
  }, [state.items]);

  // Get enhanced cart totals
  const getEnhancedCartTotals = useCallback(() => {
    return calculateCartTotals(state.items);
  }, [state.items]);

  // Get sync status
  const getSyncStatus = useCallback(() => {
    const queueStats = offlineQueueManager.getQueueStats();
    return {
      ...cartSyncManager.getSyncStatus(),
      hasOptimisticUpdates: !!state.optimisticUpdate,
      lastOptimisticUpdate: state.lastOptimisticUpdate,
      lastServerSync: state.lastServerSync,
      validationErrors: state.validationErrors,
      queueStats
    };
  }, [state.optimisticUpdate, state.lastOptimisticUpdate, state.lastServerSync, state.validationErrors]);

  // Process offline queue
  const processOfflineQueue = useCallback(async () => {
    if (!isAuthenticated || !navigator.onLine) {
      console.warn('Cannot process offline queue: not authenticated or offline');
      return;
    }

    try {
      dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.SYNCING });
      
      const result = await offlineQueueManager.processQueue();
      
      if (result.success) {
        console.log('✅ All queued operations processed successfully');
        await reconcileWithServer();
        showSuccessToast('All changes synced successfully!');
        dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.IDLE });
      } else {
        console.warn(`⚠️ Some operations failed: ${result.processed - result.results.filter(r => r.success).length}`);
        dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.ERROR });
        
        if (result.remaining > 0) {
          showWarningToast(`${result.remaining} operations still pending`);
        }
      }
      
    } catch (error) {
      console.error('Failed to process offline queue:', error);
      dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.ERROR });
      
      const errorObj = createErrorObject(error, { operation: 'processOfflineQueue' });
      showCartError('SYNC_FAILED', errorObj, {
        onRetry: processOfflineQueue
      });
    }
  }, [isAuthenticated, reconcileWithServer]);

  // Clear offline queue
  const clearOfflineQueue = useCallback(() => {
    offlineQueueManager.clearQueue();
    showSuccessToast('Offline queue cleared');
  }, []);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    return offlineQueueManager.getQueueStats();
  }, []);

  // Manual cart migration with options
  const performManualMigration = useCallback(async (options = {}) => {
    if (!isAuthenticated) {
      showCartError('AUTH_ERROR', createErrorObject(new Error('Must be logged in to migrate cart')));
      return;
    }

    const guestCart = getGuestCartItems();
    const pendingMigration = localStorage.getItem('pendingCartMigration');
    
    if (guestCart.length === 0 && !pendingMigration) {
      showWarningToast('No guest cart items to migrate');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await handleCartMigration();
      showSuccessToast('Manual migration completed');
    } catch (error) {
      const errorObj = createErrorObject(error, { operation: 'manualMigration' });
      showCartError('MIGRATION_FAILED', errorObj);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated, handleCartMigration]);

  // Check if migration is needed
  const needsMigration = useCallback(() => {
    const guestCart = getGuestCartItems();
    const pendingMigration = localStorage.getItem('pendingCartMigration');
    return guestCart.length > 0 || !!pendingMigration;
  }, []);

  // Get migration status
  const getMigrationStatus = useCallback(() => {
    const guestCart = getGuestCartItems();
    const pendingMigration = localStorage.getItem('pendingCartMigration');
    
    return {
      needsMigration: guestCart.length > 0 || !!pendingMigration,
      guestItemCount: guestCart.length,
      hasPendingMigration: !!pendingMigration,
      isAuthenticated,
      canMigrate: isAuthenticated && (guestCart.length > 0 || !!pendingMigration)
    };
  }, [isAuthenticated]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (isAuthenticated) {
        const queueStats = offlineQueueManager.getQueueStats();
        if (queueStats.pending > 0) {
          console.log(`🌐 Connection restored, processing ${queueStats.pending} queued operations`);
          processOfflineQueue();
        }
      }
    };

    const handleOffline = () => {
      console.log('📡 Connection lost, operations will be queued');
      dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
      dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.OFFLINE });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, processOfflineQueue]);

  // Periodic validation and sync
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      // Validate cart every 30 seconds
      validateCart();
      
      // Process offline queue if there are pending operations and we're online
      const queueStats = offlineQueueManager.getQueueStats();
      if (queueStats.pending > 0 && navigator.onLine) {
        console.log(`⏰ Periodic sync: processing ${queueStats.pending} queued operations`);
        processOfflineQueue();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateCart, processOfflineQueue]);

  // Set up offline queue event listeners
  useEffect(() => {
    const handleQueueEvent = (event, data) => {
      switch (event) {
        case 'operationAdded':
          console.log('📝 Operation added to queue:', data.type);
          break;
        case 'processingStarted':
          dispatch({ type: 'SET_SYNC_STATE', payload: SyncState.SYNCING });
          break;
        case 'processingCompleted':
          const successCount = data.filter(r => r.success).length;
          console.log(`✅ Queue processing completed: ${successCount}/${data.length} succeeded`);
          break;
        case 'queueCleared':
          console.log('🗑️ Offline queue cleared');
          break;
      }
    };

    offlineQueueManager.addEventListener(handleQueueEvent);
    
    return () => {
      offlineQueueManager.removeEventListener(handleQueueEvent);
    };
  }, []);

  return (
    <CartContext.Provider value={{
      ...state,
      addToCart,
      updateCartItem,
      removeFromCart,
      clearCart,
      getCartTotal,
      getCartItemCount,
      clearError,
      retryLastOperation,
      isItemInCart,
      reconcileWithServer,
      syncPendingOperations,
      validateCart,
      getEnhancedCartTotals,
      getSyncStatus,
      processOfflineQueue,
      clearOfflineQueue,
      getQueueStats,
      performManualMigration,
      needsMigration,
      getMigrationStatus,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};