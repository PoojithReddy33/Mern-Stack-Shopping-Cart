import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { getGuestCartItems, clearGuestCart, cleanCartItems } from '../utils/cartMigration';

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
    default:
      return state;
  }
};

const initialState = {
  items: JSON.parse(localStorage.getItem('cart')) || [],
  totalAmount: 0,
  loading: false,
  error: null,
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
      const response = await cartAPI.getCart();
      dispatch({ type: 'SET_CART', payload: response.data.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error?.message });
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
      
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        // First load existing server cart
        const serverCartResponse = await cartAPI.getCart();
        const serverCart = serverCartResponse.data.data;
        
        // Migrate guest cart items to server
        try {
          await cartAPI.migrateCart(itemsToMigrate);
        } catch (error) {
          console.warn('Bulk cart migration failed, trying individual items:', error);
          // Fallback to individual item migration
          for (const item of itemsToMigrate) {
            try {
              await cartAPI.addToCart({
                productId: item.productId,
                size: item.size,
                quantity: item.quantity,
                price: item.price
              });
            } catch (itemError) {
              console.warn('Failed to migrate cart item:', item, itemError);
            }
          }
        }
        
        // Load updated cart from server
        await loadCartFromServer();
        
        // Clean up migration data
        clearGuestCart();
        
      } catch (error) {
        console.error('Cart migration failed:', error);
        // Fallback to just loading server cart
        await loadCartFromServer();
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
  }, [isAuthenticated, loadCartFromServer]);

  const addToCart = async (productId, size, quantity = 1, price) => {
    const item = { productId, size, quantity, price };
    
    if (isAuthenticated) {
      try {
        await cartAPI.addToCart(item);
        await loadCartFromServer();
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error?.message });
      }
    } else {
      dispatch({ type: 'ADD_ITEM', payload: item });
    }
  };

  const updateCartItem = async (productId, size, quantity) => {
    if (isAuthenticated) {
      try {
        await cartAPI.updateCartItem({ productId, size, quantity });
        await loadCartFromServer();
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error?.message });
      }
    } else {
      dispatch({ type: 'UPDATE_ITEM', payload: { productId, size, quantity } });
    }
  };

  const removeFromCart = async (productId, size) => {
    if (isAuthenticated) {
      try {
        await cartAPI.removeFromCart(productId, size);
        await loadCartFromServer();
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error?.message });
      }
    } else {
      dispatch({ type: 'REMOVE_ITEM', payload: { productId, size } });
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await cartAPI.clearCart();
        dispatch({ type: 'CLEAR_CART' });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error?.message });
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

  return (
    <CartContext.Provider value={{
      ...state,
      addToCart,
      updateCartItem,
      removeFromCart,
      clearCart,
      getCartTotal,
      getCartItemCount,
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