import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  ShoppingBag,
  LocalShipping,
  CheckCircle,
  Cancel,
  Refresh,
  Receipt
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ordersAPI } from '../services/api';

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDialog, setOrderDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(null);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getOrders();
      if (response.data.success) {
        setOrders(response.data.data.orders);
      }
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await ordersAPI.getOrder(orderId);
      if (response.data.success) {
        setSelectedOrder(response.data.data.order);
        setOrderDialog(true);
      }
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to fetch order details');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancellingOrder || !cancelReason.trim()) {
      return;
    }

    try {
      const response = await ordersAPI.updateOrder(cancellingOrder, {
        status: 'cancelled',
        reason: cancelReason
      });
      
      if (response.data.success) {
        // Update the order in the list
        setOrders(prev => prev.map(order => 
          order._id === cancellingOrder 
            ? { ...order, status: 'cancelled' }
            : order
        ));
        setCancelDialog(false);
        setCancellingOrder(null);
        setCancelReason('');
      }
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to cancel order');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'processing':
        return 'primary';
      case 'shipped':
        return 'secondary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Refresh />;
      case 'confirmed':
      case 'processing':
        return <ShoppingBag />;
      case 'shipped':
        return <LocalShipping />;
      case 'delivered':
        return <CheckCircle />;
      case 'cancelled':
        return <Cancel />;
      default:
        return <Receipt />;
    }
  };

  const canCancelOrder = (order) => {
    return ['pending', 'confirmed'].includes(order.status);
  };

  if (!isAuthenticated) {
    return (
      <Alert severity="warning">
        Please log in to view your order history.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Order History
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ShoppingBag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No orders yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start shopping to see your orders here
          </Typography>
          <Button variant="contained" href="/products">
            Start Shopping
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => (
            <Grid item xs={12} key={order._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Order #{order.orderNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip
                      icon={getStatusIcon(order.status)}
                      label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      color={getStatusColor(order.status)}
                      variant="outlined"
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Items: {order.itemCount || order.items?.length || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Payment: {order.payment?.status || 'Pending'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
                      <Typography variant="h6">
                        ₹{order.pricing?.total || order.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {order.currency || 'INR'}
                      </Typography>
                    </Grid>
                  </Grid>

                  {order.tracking?.trackingNumber && (
                    <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        Tracking: {order.tracking.trackingNumber}
                      </Typography>
                      {order.tracking.carrier && (
                        <Typography variant="caption" color="text.secondary">
                          Carrier: {order.tracking.carrier}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleViewOrder(order._id)}
                  >
                    View Details
                  </Button>
                  
                  {canCancelOrder(order) && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setCancellingOrder(order._id);
                        setCancelDialog(true);
                      }}
                    >
                      Cancel Order
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Order Details Dialog */}
      <Dialog open={orderDialog} onClose={() => setOrderDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Order Details - #{selectedOrder?.orderNumber}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Order Information
                  </Typography>
                  <Typography variant="body2">
                    Status: <Chip 
                      label={selectedOrder.status} 
                      color={getStatusColor(selectedOrder.status)} 
                      size="small" 
                    />
                  </Typography>
                  <Typography variant="body2">
                    Placed: {new Date(selectedOrder.createdAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Payment: {selectedOrder.payment?.status}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Shipping Address
                  </Typography>
                  <Typography variant="body2">
                    {selectedOrder.shippingAddress?.firstName} {selectedOrder.shippingAddress?.lastName}
                  </Typography>
                  <Typography variant="body2">
                    {selectedOrder.shippingAddress?.street}
                  </Typography>
                  <Typography variant="body2">
                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.postalCode}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" gutterBottom>
                Order Items
              </Typography>
              <List>
                {selectedOrder.items?.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={item.productSnapshot?.name || 'Product'}
                      secondary={`Size: ${item.size} | Quantity: ${item.quantity} | Price: ₹${item.price}`}
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2">
                  Subtotal: ₹{selectedOrder.pricing?.subtotal}
                </Typography>
                <Typography variant="body2">
                  Tax: ₹{selectedOrder.pricing?.tax}
                </Typography>
                <Typography variant="body2">
                  Shipping: ₹{selectedOrder.pricing?.shipping}
                </Typography>
                {selectedOrder.pricing?.discount > 0 && (
                  <Typography variant="body2" color="success.main">
                    Discount: -₹{selectedOrder.pricing.discount}
                  </Typography>
                )}
                <Typography variant="h6">
                  Total: ₹{selectedOrder.pricing?.total}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to cancel this order? This action cannot be undone.
          </Typography>
          <TextField
            fullWidth
            label="Reason for cancellation"
            multiline
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>Keep Order</Button>
          <Button 
            onClick={handleCancelOrder} 
            color="error" 
            variant="contained"
            disabled={!cancelReason.trim()}
          >
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderHistoryPage;