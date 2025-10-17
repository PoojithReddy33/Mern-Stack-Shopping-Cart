import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Rating,
  IconButton
} from '@mui/material';
import {
  ShoppingCart,
  Favorite,
  FavoriteBorder
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProductCard = ({ product, onAddToCart, onToggleFavorite, isFavorite = false }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // For guest users, allow adding to cart without authentication
    // Find the first available size
    const availableSize = product.sizes?.find(s => s.stock > (s.reserved || 0));

    if (!availableSize) {
      // If no sizes available, navigate to product detail
      navigate(`/products/${product._id}`);
      return;
    }

    try {
      await addToCart(product._id, availableSize.size, 1, product.currentPrice || product.price?.original);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
      // Navigate to product detail if there's an error
      navigate(`/products/${product._id}`);
    }
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/products/${product._id}`);
  };

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product._id);
    }
  };

  const handleCardClick = () => {
    navigate(`/products/${product._id}`);
  };

  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
  const isOutOfStock = product.availability?.status === 'out-of-stock' || product.availableStock === 0;
  const hasDiscount = product.price?.discounted && product.price.discounted < product.price.original;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        },
        position: 'relative'
      }}
      onClick={handleCardClick}
    >
      {/* Discount Badge */}
      {hasDiscount && (
        <Chip
          label={`${product.discountPercentage}% OFF`}
          color="error"
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 1,
            fontWeight: 'bold'
          }}
        />
      )}

      {/* Favorite Button */}
      <IconButton
        onClick={handleToggleFavorite}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }
        }}
      >
        {isFavorite ? (
          <Favorite color="error" />
        ) : (
          <FavoriteBorder />
        )}
      </IconButton>

      {/* Product Image */}
      <CardMedia
        component="img"
        height="240"
        image={primaryImage?.url || '/placeholder-image.jpg'}
        alt={primaryImage?.alt || product.name}
        sx={{
          objectFit: 'cover',
          filter: isOutOfStock ? 'grayscale(50%)' : 'none'
        }}
      />

      {/* Product Content */}
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Brand */}
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
          {product.brand}
        </Typography>

        {/* Product Name */}
        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontWeight: 500,
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {product.name}
        </Typography>

        {/* Short Description */}
        {product.shortDescription && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {product.shortDescription}
          </Typography>
        )}

        {/* Rating */}
        {product.ratings?.average > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Rating
              value={product.ratings.average}
              precision={0.1}
              size="small"
              readOnly
            />
            <Typography variant="caption" sx={{ ml: 1 }}>
              ({product.ratings.count})
            </Typography>
          </Box>
        )}

        {/* Price */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
            ₹{product.currentPrice || product.price?.original}
          </Typography>
          {hasDiscount && (
            <Typography
              variant="body2"
              component="span"
              sx={{
                textDecoration: 'line-through',
                color: 'text.secondary'
              }}
            >
              ₹{product.price.original}
            </Typography>
          )}
        </Box>

        {/* Availability Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isOutOfStock ? (
            <Chip
              label="Out of Stock"
              color="error"
              size="small"
              variant="outlined"
            />
          ) : (
            <Chip
              label="In Stock"
              color="success"
              size="small"
              variant="outlined"
            />
          )}

          {product.availableStock <= 5 && product.availableStock > 0 && (
            <Typography variant="caption" color="warning.main">
              Only {product.availableStock} left
            </Typography>
          )}
        </Box>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ pt: 0, px: 2, pb: 2, gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<ShoppingCart />}
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            flex: 1
          }}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleQuickView}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            minWidth: 'auto',
            px: 2
          }}
        >
          View
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProductCard;