const crypto = require('crypto');
const axios = require('axios');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// PhonePe configuration
const PHONEPE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.phonepe.com/apis/hermes' 
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const PHONEPE_MERCHANT_ID = process.env.PHONEPAY_MERCHANT_ID;
const PHONEPE_SALT_KEY = process.env.PHONEPAY_SALT_KEY;
const PHONEPE_SALT_INDEX = process.env.PHONEPAY_SALT_INDEX || 1;

// Generate PhonePe checksum
const generateChecksum = (payload, endpoint) => {
  const string = payload + endpoint + PHONEPE_SALT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return sha256 + '###' + PHONEPE_SALT_INDEX;
};

// Verify PhonePe checksum
const verifyChecksum = (receivedChecksum, payload, endpoint) => {
  const expectedChecksum = generateChecksum(payload, endpoint);
  return receivedChecksum === expectedChecksum;
};

// @desc    Initiate PhonePe payment
// @route   POST /api/payment/initiate
// @access  Private
const initiatePayment = async (req, res) => {
  try {
    const { orderId, returnUrl, callbackUrl } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Order ID is required' }
      });
    }

    // Get order details
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Order not found' }
      });
    }

    if (order.payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Payment already processed for this order' }
      });
    }

    // Generate unique transaction ID
    const transactionId = `TXN_${order.orderNumber}_${Date.now()}`;
    
    // Convert amount to paise (PhonePe expects amount in paise)
    const amountInPaise = Math.round(order.pricing.total * 100);

    // Prepare PhonePe payment request
    const paymentPayload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: req.user._id.toString(),
      amount: amountInPaise,
      redirectUrl: returnUrl || `${req.protocol}://${req.get('host')}/payment/success`,
      redirectMode: 'POST',
      callbackUrl: callbackUrl || `${req.protocol}://${req.get('host')}/api/payment/callback`,
      mobileNumber: order.shippingAddress.phone,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    // Encode payload to base64
    const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
    
    // Generate checksum
    const endpoint = '/pg/v1/pay';
    const checksum = generateChecksum(base64Payload, endpoint);

    // Prepare request headers
    const headers = {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'accept': 'application/json'
    };

    // Make request to PhonePe
    const phonepeResponse = await axios.post(
      `${PHONEPE_BASE_URL}${endpoint}`,
      {
        request: base64Payload
      },
      { headers }
    );

    if (phonepeResponse.data.success) {
      // Update order with transaction ID
      order.payment.transactionId = transactionId;
      order.payment.status = 'processing';
      await order.save();

      res.json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          paymentUrl: phonepeResponse.data.data.instrumentResponse.redirectInfo.url,
          transactionId,
          orderId: order._id,
          amount: order.pricing.total,
          currency: order.currency
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: { 
          message: 'Failed to initiate payment',
          details: phonepeResponse.data.message
        }
      });
    }
  } catch (error) {
    console.error('Initiate payment error:', error);
    
    if (error.response) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Payment gateway error',
          details: error.response.data
        }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while initiating payment' }
    });
  }
};

// @desc    Handle PhonePe payment callback
// @route   POST /api/payment/callback
// @access  Public (webhook)
const handlePaymentCallback = async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid callback data' }
      });
    }

    // Decode base64 response
    const decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString());
    const transactionId = decodedResponse.data.merchantTransactionId;

    // Find order by transaction ID
    const order = await Order.findOne({
      'payment.transactionId': transactionId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Order not found for transaction' }
      });
    }

    // Update order based on payment status
    if (decodedResponse.success && decodedResponse.code === 'PAYMENT_SUCCESS') {
      // Payment successful
      await order.processPayment(transactionId, decodedResponse);
      
      // Clear user's cart after successful payment
      const cart = await Cart.findByUser(order.user);
      if (cart) {
        await cart.clearCart();
      }

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.payment.status
        }
      });
    } else {
      // Payment failed
      order.payment.status = 'failed';
      order.payment.paymentGatewayResponse = decodedResponse;
      await order.save();

      // Release reserved stock
      for (const item of order.items) {
        const Product = require('../models/Product');
        const product = await Product.findById(item.product);
        if (product) {
          await product.releaseStock(item.size, item.quantity);
        }
      }

      res.json({
        success: false,
        message: 'Payment failed',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.payment.status,
          failureReason: decodedResponse.message
        }
      });
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while processing payment callback' }
    });
  }
};

// @desc    Check payment status
// @route   GET /api/payment/status/:transactionId
// @access  Private
const checkPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Find order by transaction ID
    const order = await Order.findOne({
      'payment.transactionId': transactionId,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transaction not found' }
      });
    }

    // Check status with PhonePe
    const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${transactionId}`;
    const checksum = generateChecksum('', endpoint);

    const headers = {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
      'accept': 'application/json'
    };

    const phonepeResponse = await axios.get(
      `${PHONEPE_BASE_URL}${endpoint}`,
      { headers }
    );

    if (phonepeResponse.data.success) {
      const paymentData = phonepeResponse.data.data;
      
      // Update order if status changed
      if (paymentData.state === 'COMPLETED' && order.payment.status !== 'completed') {
        await order.processPayment(transactionId, paymentData);
        
        // Clear cart
        const cart = await Cart.findByUser(order.user);
        if (cart) {
          await cart.clearCart();
        }
      } else if (paymentData.state === 'FAILED' && order.payment.status !== 'failed') {
        order.payment.status = 'failed';
        order.payment.paymentGatewayResponse = paymentData;
        await order.save();
      }

      res.json({
        success: true,
        data: {
          transactionId,
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.payment.status,
          orderStatus: order.status,
          amount: order.pricing.total,
          currency: order.currency,
          gatewayResponse: paymentData
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: { 
          message: 'Failed to check payment status',
          details: phonepeResponse.data.message
        }
      });
    }
  } catch (error) {
    console.error('Check payment status error:', error);
    
    if (error.response) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Payment gateway error',
          details: error.response.data
        }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while checking payment status' }
    });
  }
};

// @desc    Initiate refund
// @route   POST /api/payment/refund
// @access  Private
const initiateRefund = async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'Order ID and refund amount are required' }
      });
    }

    // Get order details
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Order not found' }
      });
    }

    if (order.payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot refund unpaid order' }
      });
    }

    // Generate unique refund transaction ID
    const refundTransactionId = `REFUND_${order.orderNumber}_${Date.now()}`;
    const amountInPaise = Math.round(amount * 100);

    // Prepare PhonePe refund request
    const refundPayload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantUserId: req.user._id.toString(),
      originalTransactionId: order.payment.transactionId,
      merchantTransactionId: refundTransactionId,
      amount: amountInPaise,
      callbackUrl: `${req.protocol}://${req.get('host')}/api/payment/refund-callback`
    };

    // Encode payload to base64
    const base64Payload = Buffer.from(JSON.stringify(refundPayload)).toString('base64');
    
    // Generate checksum
    const endpoint = '/pg/v1/refund';
    const checksum = generateChecksum(base64Payload, endpoint);

    // Prepare request headers
    const headers = {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'accept': 'application/json'
    };

    // Make request to PhonePe
    const phonepeResponse = await axios.post(
      `${PHONEPE_BASE_URL}${endpoint}`,
      {
        request: base64Payload
      },
      { headers }
    );

    if (phonepeResponse.data.success) {
      // Update order with refund information
      order.payment.refundAmount = amount;
      order.returnRequest = {
        requested: true,
        requestedAt: new Date(),
        reason: reason || 'Customer requested refund',
        status: 'pending'
      };
      await order.save();

      res.json({
        success: true,
        message: 'Refund initiated successfully',
        data: {
          refundTransactionId,
          orderId: order._id,
          refundAmount: amount,
          currency: order.currency
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: { 
          message: 'Failed to initiate refund',
          details: phonepeResponse.data.message
        }
      });
    }
  } catch (error) {
    console.error('Initiate refund error:', error);
    
    if (error.response) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Payment gateway error',
          details: error.response.data
        }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while initiating refund' }
    });
  }
};

module.exports = {
  initiatePayment,
  handlePaymentCallback,
  checkPaymentStatus,
  initiateRefund
};