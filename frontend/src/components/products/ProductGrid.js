import React from 'react';
import {
  Grid,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import ProductCard from './ProductCard';

const ProductGrid = ({
  products = [],
  loading = false,
  error = null,
  pagination = null,
  onPageChange,
  onSortChange,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onAddToCart,
  onToggleFavorite,
  favoriteProducts = []
}) => {

  const handleSortChange = (event) => {
    const [field, order] = event.target.value.split('-');
    if (onSortChange) {
      onSortChange(field, order);
    }
  };

  const handlePageChange = (event, page) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 400 
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No products found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try adjusting your filters or search terms
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Sort Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {pagination ? `Showing ${products.length} of ${pagination.totalProducts} products` : `${products.length} products`}
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={`${sortBy}-${sortOrder}`}
            label="Sort By"
            onChange={handleSortChange}
          >
            <MenuItem value="createdAt-desc">Newest First</MenuItem>
            <MenuItem value="createdAt-asc">Oldest First</MenuItem>
            <MenuItem value="price.original-asc">Price: Low to High</MenuItem>
            <MenuItem value="price.original-desc">Price: High to Low</MenuItem>
            <MenuItem value="name-asc">Name: A to Z</MenuItem>
            <MenuItem value="name-desc">Name: Z to A</MenuItem>
            <MenuItem value="ratings.average-desc">Highest Rated</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Product Grid */}
      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favoriteProducts.includes(product._id)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Stack spacing={2} alignItems="center">
            <Pagination
              count={pagination.totalPages}
              page={pagination.currentPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
            <Typography variant="caption" color="text.secondary">
              Page {pagination.currentPage} of {pagination.totalPages}
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default ProductGrid;