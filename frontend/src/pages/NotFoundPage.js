import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Home, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        py: 8
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '4rem', md: '6rem' },
          fontWeight: 'bold',
          color: 'primary.main',
          mb: 2
        }}
      >
        404
      </Typography>
      
      <Typography variant="h4" component="h1" gutterBottom>
        Page Not Found
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
        Sorry, the page you are looking for doesn't exist or has been moved. 
        Let's get you back to shopping!
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          variant="contained"
          startIcon={<Home />}
          onClick={() => navigate('/')}
          size="large"
        >
          Go Home
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          size="large"
        >
          Go Back
        </Button>
      </Box>
    </Box>
  );
};

export default NotFoundPage;