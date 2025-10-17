import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ShoppingCart,
  Add,
  Remove,
  Delete,
  ShoppingBag,
  LocalShipping,
  Security,
  Discount
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const CartPage = () => {
  const [couponCode, setCouponCode] = useState('');
  const [applyCouponLoading, setApplyCouponLoading] = useState(false);
  const [removeDialog, setRemoveDialog] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [error, setError] = useState('');

  const {
    items,
    loading,
    getCartTotal,
    getCartItemCount,
    updateCartItem,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon
  } = useCart();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleQuantityChange = async (productId, size, newQuantity) => {
    try {
      setError('');
      await updateCartItem(productId, size, newQuantity);
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to update item');
    }
  };

  const handleRemoveItem = async (productId, size) => {
    try {
      setError('');
      await removeFromCart(productId, size);
      setRemoveDialog(false);
      setItemToRemove(null);
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to remove item');
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setApplyCouponLoading(true);
    setError('');

    try {
      await applyCoupon(couponCode.toUpperCase());
      setCouponCode('');
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to apply coupon');
    } finally {
      setApplyCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async (code) => {
    try {
      setError('');
      await removeCoupon(code);
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to remove coupon');
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  const cartTotal = getCartTotal();
  const itemCount = getCartItemCount();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 8, textAlign: 'center' }}>
        <ShoppingCart sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
        <Typography variant="h4" gutterBottom>
          Your cart is empty
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Looks like you haven't added any items to your cart yet.
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          to="/products"
          startIcon={<ShoppingBag />}
        >
          Continue Shopping
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Cart Items */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 0 }}>
            <List>
              {items.map((item, index) => (
                <React.Fragment key={`${item.productId}-${item.size}`}>
                  <ListItem sx={{ py: 2, px: 3 }}>
                    <ListItemAvatar>
                      <Avatar
                        src={item.product?.images?.[0]?.url || '/placeholder-image.jpg'}
                        alt={item.product?.name}
                        sx={{ width: 80, height: 80, mr: 2 }}
                        variant="rounded"
                      />
                    </ListItemAvatar>
                    
                    <ListItemText
                      sx={{ ml: 2 }}
                      primary={
                        <Typography variant="h6" component="div">
                          {item.product?.name || 'Product'}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {item.product?.brand} • Size: {item.size}
                          </Typography>
                          <Typography variant="h6" sx={{ mt: 1 }}>
                            ₹{item.price}
                          </Typography>
                        </Box>
                      }
                    />

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      {/* Quantity Controls */}
                      <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(item.productId, item.size, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Remove />
                        </IconButton>
                        <TextField
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            if (newQuantity >= 1 && newQuantity <= 10) {
                              handleQuantityChange(item.productId, item.size, newQuantity);
                            }
                          }}
                          inputProps={{ 
                            min: 1, 
                            max: 10, 
                            style: { textAlign: 'center', width: '60px' } 
                          }}
                          variant="standard"
                          InputProps={{ disableUnderline: true }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(item.productId, item.size, item.quantity + 1)}
                          disabled={item.quantity >= 10}
                        >
                          <Add />
                        </IconButton>
                      </Box>

                      {/* Remove Button */}
                      <IconButton
                        color="error"
                        onClick={() => {
                          setItemToRemove({ productId: item.productId, size: item.size, name: item.product?.name });
                          setRemoveDialog(true);
                        }}
                      >
                        <Delete />
                      </IconButton>

                      {/* Item Subtotal */}
                      <Typography variant="h6" fontWeight="bold">
                        ₹{item.price * item.quantity}
                      </Typography>
                    </Box>
                  </ListItem>
                  {index < items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            {/* Clear Cart Button */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => clearCart()}
                startIcon={<Delete />}
              >
                Clear Cart
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotal ({itemCount} items)</Typography>
                <Typography>₹{cartTotal}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Shipping</Typography>
                <Typography color={cartTotal >= 999 ? 'success.main' : 'text.primary'}>
                  {cartTotal >= 999 ? 'FREE' : '₹99'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Tax (18% GST)</Typography>
                <Typography>₹{Math.round(cartTotal * 0.18)}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">
                  ₹{cartTotal + (cartTotal >= 999 ? 0 : 99) + Math.round(cartTotal * 0.18)}
                </Typography>
              </Box>
            </Box>

            {/* Coupon Section */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Discount /> Apply Coupon
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || applyCouponLoading}
                    size="small"
                  >
                    {applyCouponLoading ? <CircularProgress size={20} /> : 'Apply'}
                  </Button>
                </Box>

                {/* Available Coupons */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label="WELCOME10 - ₹100 off"
                    size="small"
                    variant="outlined"
                    onClick={() => setCouponCode('WELCOME10')}
                    clickable
                  />
                  <Chip
                    label="SAVE20 - 20% off"
                    size="small"
                    variant="outlined"
                    onClick={() => setCouponCode('SAVE20')}
                    clickable
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Shipping Info */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocalShipping color="primary" fontSize="small" />
                <Typography variant="body2">
                  {cartTotal >= 999 ? 'Free shipping applied!' : `Add ₹${999 - cartTotal} more for free shipping`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security color="primary" fontSize="small" />
                <Typography variant="body2">
                  Secure checkout & 7-day returns
                </Typography>
              </Box>
            </Box>

            {/* Checkout Button */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleCheckout}
              sx={{ mb: 2, py: 1.5 }}
            >
              {isAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
            </Button>

            <Button
              variant="outlined"
              fullWidth
              component={Link}
              to="/products"
            >
              Continue Shopping
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Remove Item Dialog */}
      <Dialog open={removeDialog} onClose={() => setRemoveDialog(false)}>
        <DialogTitle>Remove Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove "{itemToRemove?.name}" from your cart?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialog(false)}>Cancel</Button>
          <Button
            onClick={() => handleRemoveItem(itemToRemove?.productId, itemToRemove?.size)}
            color="error"
            variant="contained"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CartPage;