import React from 'react';
import { Typography, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h2" component="h1" gutterBottom>
        Welcome to Men's Clothing Shop
      </Typography>
      <Typography variant="h5" component="h2" gutterBottom color="text.secondary">
        Discover the latest in men's fashion
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          component={Link}
          to="/products"
          sx={{ mr: 2 }}
        >
          Shop Now
        </Button>
        <Button
          variant="outlined"
          size="large"
          component={Link}
          to="/products"
        >
          Browse Collection
        </Button>
      </Box>
    </Box>
  );
};

export default HomePage;