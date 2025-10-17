import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ShoppingCart,
  LocalShipping,
  Payment,
  CheckCircle,
  CreditCard,
  AccountBalance
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { ordersAPI, paymentAPI } from '../services/api';

const steps = ['Shipping Information', 'Payment Method', 'Review Order'];

const CheckoutPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderTotal, setOrderTotal] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(false);

  // Form data
  const [shippingData, setShippingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });

  const [billingData, setBillingData] = useState({
    sameAsShipping: true,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });

  const [paymentMethod, setPaymentMethod] = useState('phonepay');
  const [customerNotes, setCustomerNotes] = useState('');

  const { items, getCartTotal, getCartItemCount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setShippingData(prev => ({
        ...prev,
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email || '',
        phone: user.profile?.phone || ''
      }));

      // Use default address if available
      const defaultAddress = user.addresses?.find(addr => addr.isDefault);
      if (defaultAddress) {
        setShippingData(prev => ({
          ...prev,
          street: defaultAddress.street,
          city: defaultAddress.city,
          state: defaultAddress.state,
          postalCode: defaultAddress.postalCode,
          country: defaultAddress.country
        }));
      }
    }
  }, [user]);

  const calculateOrderTotal = useCallback(async () => {
    try {
      const response = await ordersAPI.calculateTotal({
        shippingAddress: shippingData,
        billingAddress: billingData.sameAsShipping ? shippingData : billingData
      });

      if (response.data.success) {
        setOrderTotal(response.data.data.orderSummary);
      }
    } catch (error) {
      console.error('Error calculating total:', error);
    }
  }, [shippingData, billingData]);

  // Calculate order total when component mounts
  useEffect(() => {
    calculateOrderTotal();
  }, [calculateOrderTotal]);

  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShippingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBillingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBillingData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateShipping = () => {
    const required = ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'state', 'postalCode'];
    return required.every(field => shippingData[field]?.trim());
  };

  const validateBilling = () => {
    if (billingData.sameAsShipping) return true;
    const required = ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'state', 'postalCode'];
    return required.every(field => billingData[field]?.trim());
  };

  const handleNext = async () => {
    setError('');

    if (activeStep === 0) {
      if (!validateShipping()) {
        setError('Please fill in all required shipping information');
        return;
      }
    } else if (activeStep === 1) {
      if (!validateBilling()) {
        setError('Please fill in all required billing information');
        return;
      }
      // Recalculate total with final addresses
      await calculateOrderTotal();
    }

    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');

    try {
      // Create order
      const orderData = {
        shippingAddress: shippingData,
        billingAddress: billingData.sameAsShipping ? shippingData : billingData,
        paymentMethod,
        customerNotes
      };

      const response = await ordersAPI.createOrder(orderData);

      if (response.data.success) {
        const order = response.data.data.order;
        setCreatedOrder(order);

        // Initiate payment
        if (paymentMethod === 'phonepay') {
          const paymentResponse = await paymentAPI.initiatePayment({
            orderId: order._id,
            returnUrl: `${window.location.origin}/payment/success`,
            callbackUrl: `${window.location.origin}/api/payment/callback`
          });

          if (paymentResponse.data.success) {
            // Redirect to PhonePe payment page
            window.location.href = paymentResponse.data.data.paymentUrl;
          } else {
            setError('Failed to initiate payment. Please try again.');
          }
        } else {
          // For other payment methods, show success
          setPaymentDialog(true);
        }
      }
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    navigate('/orders', { replace: true });
  };

  if (!items || items.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 8, textAlign: 'center' }}>
        <ShoppingCart sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
        <Typography variant="h5" gutterBottom>
          Your cart is empty
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Add some items to your cart before checkout.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/products')}>
          Continue Shopping
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Checkout
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Step 1: Shipping Information */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalShipping /> Shipping Information
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      name="firstName"
                      value={shippingData.firstName}
                      onChange={handleShippingChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      name="lastName"
                      value={shippingData.lastName}
                      onChange={handleShippingChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={shippingData.email}
                      onChange={handleShippingChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      value={shippingData.phone}
                      onChange={handleShippingChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      name="street"
                      value={shippingData.street}
                      onChange={handleShippingChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="City"
                      name="city"
                      value={shippingData.city}
                      onChange={handleShippingChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="State"
                      name="state"
                      value={shippingData.state}
                      onChange={handleShippingChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Postal Code"
                      name="postalCode"
                      value={shippingData.postalCode}
                      onChange={handleShippingChange}
                      required
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Step 2: Payment Method */}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Payment /> Payment Method
                </Typography>

                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <FormLabel component="legend">Select Payment Method</FormLabel>
                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <FormControlLabel
                      value="phonepay"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCard />
                          PhonePe (UPI, Cards, Net Banking)
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="cod"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccountBalance />
                          Cash on Delivery
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>

                {/* Billing Address */}
                <Typography variant="h6" gutterBottom>
                  Billing Address
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={billingData.sameAsShipping}
                      onChange={handleBillingChange}
                      name="sameAsShipping"
                    />
                  }
                  label="Same as shipping address"
                  sx={{ mb: 2 }}
                />

                {!billingData.sameAsShipping && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        name="firstName"
                        value={billingData.firstName}
                        onChange={handleBillingChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        value={billingData.lastName}
                        onChange={handleBillingChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Street Address"
                        name="street"
                        value={billingData.street}
                        onChange={handleBillingChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="City"
                        name="city"
                        value={billingData.city}
                        onChange={handleBillingChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="State"
                        name="state"
                        value={billingData.state}
                        onChange={handleBillingChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Postal Code"
                        name="postalCode"
                        value={billingData.postalCode}
                        onChange={handleBillingChange}
                        required
                      />
                    </Grid>
                  </Grid>
                )}

                {/* Customer Notes */}
                <TextField
                  fullWidth
                  label="Order Notes (Optional)"
                  multiline
                  rows={3}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Any special instructions for your order..."
                  sx={{ mt: 3 }}
                />
              </Box>
            )}

            {/* Step 3: Review Order */}
            {activeStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle /> Review Your Order
                </Typography>

                {/* Order Items */}
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Order Items ({getCartItemCount()} items)
                    </Typography>
                    <List dense>
                      {items.map((item) => (
                        <ListItem key={`${item.productId}-${item.size}`}>
                          <ListItemAvatar>
                            <Avatar
                              src={item.product?.images?.[0]?.url}
                              alt={item.product?.name}
                              variant="rounded"
                            />
                          </ListItemAvatar>
                          <ListItemText
                            primary={item.product?.name}
                            secondary={`Size: ${item.size} • Qty: ${item.quantity}`}
                          />
                          <Typography variant="body2">
                            ₹{item.price * item.quantity}
                          </Typography>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Shipping Address
                    </Typography>
                    <Typography variant="body2">
                      {shippingData.firstName} {shippingData.lastName}<br />
                      {shippingData.street}<br />
                      {shippingData.city}, {shippingData.state} {shippingData.postalCode}<br />
                      {shippingData.country}<br />
                      Phone: {shippingData.phone}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Payment Method
                    </Typography>
                    <Typography variant="body2">
                      {paymentMethod === 'phonepay' ? 'PhonePe (UPI, Cards, Net Banking)' : 'Cash on Delivery'}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
              >
                Back
              </Button>
              
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  size="large"
                >
                  {loading ? <CircularProgress size={24} /> : 'Place Order'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
            </Box>
          </Grid>

          {/* Order Summary Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>

              {orderTotal ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Subtotal</Typography>
                    <Typography>₹{orderTotal.subtotal}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Shipping</Typography>
                    <Typography>₹{orderTotal.shipping}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Tax</Typography>
                    <Typography>₹{orderTotal.tax}</Typography>
                  </Box>

                  {orderTotal.discount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography color="success.main">Discount</Typography>
                      <Typography color="success.main">-₹{orderTotal.discount}</Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Total</Typography>
                    <Typography variant="h6">₹{orderTotal.total}</Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Payment Success Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)}>
        <DialogTitle>Order Placed Successfully!</DialogTitle>
        <DialogContent>
          <Typography>
            Your order has been placed successfully. You will receive a confirmation email shortly.
          </Typography>
          {createdOrder && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Order Number: {createdOrder.orderNumber}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePaymentSuccess} variant="contained">
            View Orders
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CheckoutPage;