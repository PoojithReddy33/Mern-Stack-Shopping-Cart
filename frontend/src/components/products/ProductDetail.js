import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  Rating,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Breadcrumbs,
  Link,
  IconButton,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  ShoppingCart,
  Favorite,
  FavoriteBorder,
  Share,
  ExpandMore,
  Add,
  Remove,
  LocalShipping,
  Security,
  Refresh,
  CheckCircle
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

const ProductDetail = ({ product, loading = false, onToggleFavorite, isFavorite = false }) => {
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (product?.images?.length > 0) {
      const primaryIndex = product.images.findIndex(img => img.isPrimary);
      setSelectedImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
    }
  }, [product]);

  const handleSizeChange = (event) => {
    setSelectedSize(event.target.value);
    setError('');
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedSize) {
      setError('Please select a size');
      return;
    }

    // Allow guest users to add items to cart
    // Authentication is handled in CartContext

    setAddingToCart(true);
    setError('');

    try {
      await addToCart(product._id, selectedSize, quantity, product.currentPrice);
      setShowSuccess(true);
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.shortDescription || product.description,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      setShowSuccess(true);
    }
  };

  const getSizeAvailability = (size) => {
    const sizeInfo = product?.sizeAvailability?.find(s => s.size === size);
    return sizeInfo || { available: false, stock: 0 };
  };

  const isOutOfStock = product?.availability?.status === 'out-of-stock' || product?.availableStock === 0;
  const hasDiscount = product?.price?.discounted && product.price.discounted < product.price.original;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!product) {
    return (
      <Alert severity="error">
        Product not found
      </Alert>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link color="inherit" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          Home
        </Link>
        <Link color="inherit" href="/products" onClick={(e) => { e.preventDefault(); navigate('/products'); }}>
          Products
        </Link>
        <Link 
          color="inherit" 
          href={`/products?category=${product.category}`}
          onClick={(e) => { e.preventDefault(); navigate(`/products?category=${product.category}`); }}
        >
          {product.category?.charAt(0).toUpperCase() + product.category?.slice(1)}
        </Link>
        <Typography color="text.primary">{product.name}</Typography>
      </Breadcrumbs>

      <Grid container spacing={4}>
        {/* Product Images */}
        <Grid item xs={12} md={6}>
          <Box>
            {/* Main Image */}
            <Box
              sx={{
                width: '100%',
                height: 500,
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {hasDiscount && (
                <Chip
                  label={`${product.discountPercentage}% OFF`}
                  color="error"
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 1,
                    fontWeight: 'bold'
                  }}
                />
              )}
              <img
                src={product.images?.[selectedImageIndex]?.url || '/placeholder-image.jpg'}
                alt={product.images?.[selectedImageIndex]?.alt || product.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </Box>

            {/* Thumbnail Images */}
            {product.images?.length > 1 && (
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                {product.images.map((image, index) => (
                  <Box
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    sx={{
                      width: 80,
                      height: 80,
                      border: '2px solid',
                      borderColor: selectedImageIndex === index ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      flexShrink: 0,
                      '&:hover': {
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <img
                      src={image.url}
                      alt={image.alt}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Grid>

        {/* Product Information */}
        <Grid item xs={12} md={6}>
          <Box>
            {/* Brand */}
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'medium' }}>
              {product.brand}
            </Typography>

            {/* Product Name */}
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              {product.name}
            </Typography>

            {/* Rating */}
            {product.ratings?.average > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Rating value={product.ratings.average} precision={0.1} readOnly />
                <Typography variant="body2" color="text.secondary">
                  ({product.ratings.count} reviews)
                </Typography>
              </Box>
            )}

            {/* Price */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>
                ₹{product.currentPrice || product.price?.original}
              </Typography>
              {hasDiscount && (
                <>
                  <Typography 
                    variant="h6" 
                    component="span" 
                    sx={{ 
                      textDecoration: 'line-through',
                      color: 'text.secondary'
                    }}
                  >
                    ₹{product.price.original}
                  </Typography>
                  <Chip 
                    label={`${product.discountPercentage}% OFF`} 
                    color="success" 
                    size="small"
                  />
                </>
              )}
            </Box>

            {/* Availability */}
            <Box sx={{ mb: 3 }}>
              {isOutOfStock ? (
                <Chip label="Out of Stock" color="error" icon={<Remove />} />
              ) : (
                <Chip label="In Stock" color="success" icon={<CheckCircle />} />
              )}
              {product.availableStock <= 5 && product.availableStock > 0 && (
                <Typography variant="caption" color="warning.main" sx={{ ml: 2 }}>
                  Only {product.availableStock} left in stock
                </Typography>
              )}
            </Box>

            {/* Size Selection */}
            {product.sizes?.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Size</InputLabel>
                  <Select
                    value={selectedSize}
                    label="Size"
                    onChange={handleSizeChange}
                    disabled={isOutOfStock}
                  >
                    {product.sizes.map((sizeInfo) => {
                      const availability = getSizeAvailability(sizeInfo.size);
                      return (
                        <MenuItem 
                          key={sizeInfo.size} 
                          value={sizeInfo.size}
                          disabled={!availability.available}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{sizeInfo.size}</span>
                            {!availability.available && (
                              <span style={{ color: 'text.secondary' }}>Out of Stock</span>
                            )}
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Quantity Selection */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography variant="body1">Quantity:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <IconButton 
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1 || isOutOfStock}
                  size="small"
                >
                  <Remove />
                </IconButton>
                <TextField
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  inputProps={{ 
                    min: 1, 
                    max: 10, 
                    style: { textAlign: 'center', width: '60px' } 
                  }}
                  variant="standard"
                  disabled={isOutOfStock}
                  InputProps={{ disableUnderline: true }}
                />
                <IconButton 
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 10 || isOutOfStock}
                  size="small"
                >
                  <Add />
                </IconButton>
              </Box>
            </Box>

            {/* Error Message */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={addingToCart ? <CircularProgress size={20} /> : <ShoppingCart />}
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
                sx={{ flex: 1, textTransform: 'none', fontWeight: 'medium' }}
              >
                {addingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              
              <IconButton
                onClick={() => onToggleFavorite && onToggleFavorite(product._id)}
                color={isFavorite ? 'error' : 'default'}
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                {isFavorite ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
              
              <IconButton
                onClick={handleShare}
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <Share />
              </IconButton>
            </Box>

            {/* Shipping Info */}
            <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocalShipping color="primary" />
                <Typography variant="body2" fontWeight="medium">
                  Free shipping on orders above ₹999
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security color="primary" />
                <Typography variant="body2" fontWeight="medium">
                  Secure payment & 7-day return policy
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Product Details Accordions */}
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Description</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {product.description}
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {product.features?.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Features</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {product.features.map((feature, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {product.careInstructions?.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Care Instructions</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {product.careInstructions.map((instruction, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={instruction} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Product Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Brand:</Typography>
                      <Typography variant="body2">{product.brand}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Category:</Typography>
                      <Typography variant="body2">{product.category}</Typography>
                    </Grid>
                    {product.material && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Material:</Typography>
                        <Typography variant="body2">{product.material}</Typography>
                      </Grid>
                    )}
                    {product.colors?.length > 0 && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Colors:</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          {product.colors.map((color, index) => (
                            <Box
                              key={index}
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                backgroundColor: color.hexCode,
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                              title={color.name}
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        message="Added to cart successfully!"
      />
    </Box>
  );
};

export default ProductDetail;