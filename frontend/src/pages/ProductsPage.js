import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Drawer,
  IconButton,

  Breadcrumbs,
  Link,
  Alert,
  Skeleton
} from '@mui/material';
import {
  FilterList,
  Close
} from '@mui/icons-material';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';
import { productsAPI } from '../services/api';

import ProductGrid from '../components/products/ProductGrid';
import CategoryFilter from '../components/products/CategoryFilter';
import SearchBar from '../components/products/SearchBar';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    brands: [],
    priceRange: [0, 10000],
    sizes: []
  });
  const [sorting, setSorting] = useState({
    sortBy: searchParams.get('sort') || 'createdAt',
    sortOrder: searchParams.get('order') || 'desc'
  });
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page')) || 1,
    limit: 12
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  // Get initial filters from URL
  useEffect(() => {
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    // const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const size = searchParams.get('size');

    setFilters(prev => ({
      ...prev,
      categories: category ? [category] : [],
      brands: brand ? [brand] : [],
      priceRange: [
        minPrice ? parseInt(minPrice) : 0,
        maxPrice ? parseInt(maxPrice) : 10000
      ],
      sizes: size ? [size] : []
    }));
  }, [searchParams]);

  // Build query parameters for API
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    params.set('page', pagination.page.toString());
    params.set('limit', pagination.limit.toString());
    params.set('sort', sorting.sortBy);
    params.set('order', sorting.sortOrder);

    if (filters.categories.length > 0) {
      params.set('category', filters.categories[0]);
    }
    if (filters.brands.length > 0) {
      params.set('brand', filters.brands[0]);
    }
    if (filters.priceRange[0] > 0) {
      params.set('minPrice', filters.priceRange[0].toString());
    }
    if (filters.priceRange[1] < 10000) {
      params.set('maxPrice', filters.priceRange[1].toString());
    }
    if (filters.sizes.length > 0) {
      params.set('size', filters.sizes[0]);
    }

    const searchTerm = searchParams.get('search');
    if (searchTerm) {
      params.set('q', searchTerm);
      return `/api/products/search?${params.toString()}`;
    }

    return `/api/products?${params.toString()}`;
  };

  // Fetch products
  const { data: productsData, isLoading, error } = useQuery(
    ['products', pagination, sorting, filters, searchParams.get('search')],
    async () => {
      const params = new URLSearchParams();
      
      // Add pagination
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      
      // Add sorting
      if (sorting.sortBy) {
        params.append('sortBy', sorting.sortBy);
        params.append('sortOrder', sorting.sortOrder);
      }
      
      // Add filters
      if (filters.categories.length > 0) {
        params.append('category', filters.categories.join(','));
      }
      if (filters.brands.length > 0) {
        params.append('brand', filters.brands.join(','));
      }
      if (filters.minPrice) {
        params.append('minPrice', filters.minPrice);
      }
      if (filters.maxPrice) {
        params.append('maxPrice', filters.maxPrice);
      }
      if (filters.sizes.length > 0) {
        params.append('size', filters.sizes.join(','));
      }
      
      // Add search
      const search = searchParams.get('search');
      if (search) {
        params.append('search', search);
      }
      
      const response = await productsAPI.getProducts(Object.fromEntries(params));
      return response.data;
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch filter options
  const { data: categoriesData } = useQuery(
    'categories',
    async () => {
      const response = await productsAPI.getProducts({ type: 'categories' });
      return response.data;
    },
    { staleTime: 10 * 60 * 1000 }
  );

  const { data: brandsData } = useQuery(
    'brands',
    async () => {
      const response = await productsAPI.getProducts({ type: 'brands' });
      return response.data;
    },
    { staleTime: 10 * 60 * 1000 }
  );

  const handleSearch = (searchTerm) => {
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm) {
      newParams.set('search', searchTerm);
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCategoryChange = (categoryName) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryName)
        ? prev.categories.filter(c => c !== categoryName)
        : [categoryName] // Single category selection for now
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleBrandChange = (brandName) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brandName)
        ? prev.brands.filter(b => b !== brandName)
        : [...prev.brands, brandName]
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePriceRangeChange = (newRange) => {
    setFilters(prev => ({
      ...prev,
      priceRange: newRange
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSizeChange = (size) => {
    setFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (sortBy, sortOrder) => {
    setSorting({ sortBy, sortOrder });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    setFilters({
      categories: [],
      brands: [],
      priceRange: [0, 10000],
      sizes: []
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setSearchParams({});
  };

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    // For quick add, use the first available size
    const availableSize = product.sizes?.find(s => s.stock > s.reserved);
    if (availableSize) {
      try {
        await addToCart(product._id, availableSize.size, 1, product.currentPrice);
      } catch (error) {
        console.error('Error adding to cart:', error);
      }
    } else {
      // Navigate to product detail for size selection
      navigate(`/products/${product._id}`);
    }
  };

  const searchTerm = searchParams.get('search');
  const currentCategory = filters.categories[0];

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link color="inherit" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          Home
        </Link>
        <Typography color="text.primary">Products</Typography>
        {currentCategory && (
          <Typography color="text.primary">
            {currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)}
          </Typography>
        )}
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {searchTerm ? `Search Results for "${searchTerm}"` : 
           currentCategory ? `${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)}` : 
           'All Products'}
        </Typography>
        
        {/* Search Bar */}
        <Box sx={{ maxWidth: 600, mb: 3 }}>
          <SearchBar onSearch={handleSearch} />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load products. Please try again.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Desktop Filters */}
        <Grid item md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Paper sx={{ p: 2, position: 'sticky', top: 20 }}>
            <CategoryFilter
              categories={categoriesData?.data?.categories || []}
              brands={brandsData?.data?.brands || []}
              priceRange={{ min: 0, max: 10000 }}
              selectedCategories={filters.categories}
              selectedBrands={filters.brands}
              selectedPriceRange={filters.priceRange}
              selectedSizes={filters.sizes}
              onCategoryChange={handleCategoryChange}
              onBrandChange={handleBrandChange}
              onPriceRangeChange={handlePriceRangeChange}
              onSizeChange={handleSizeChange}
              onClearFilters={handleClearFilters}
            />
          </Paper>
        </Grid>

        {/* Mobile Filter Button */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <IconButton
            color="primary"
            onClick={() => setMobileFiltersOpen(true)}
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': { backgroundColor: 'primary.dark' }
            }}
          >
            <FilterList />
          </IconButton>
        </Box>

        {/* Products Grid */}
        <Grid item xs={12} md={9}>
          {isLoading ? (
            <Grid container spacing={3}>
              {[...Array(8)].map((_, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Skeleton variant="rectangular" height={300} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </Grid>
              ))}
            </Grid>
          ) : (
            <ProductGrid
              products={productsData?.data?.products || []}
              loading={isLoading}
              error={error?.message}
              pagination={productsData?.data?.pagination}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
              sortBy={sorting.sortBy}
              sortOrder={sorting.sortOrder}
              onAddToCart={handleAddToCart}
              favoriteProducts={[]} // TODO: Implement favorites
            />
          )}
        </Grid>
      </Grid>

      {/* Mobile Filters Drawer */}
      <Drawer
        anchor="right"
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setMobileFiltersOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          
          <CategoryFilter
            categories={categoriesData?.data?.categories || []}
            brands={brandsData?.data?.brands || []}
            priceRange={{ min: 0, max: 10000 }}
            selectedCategories={filters.categories}
            selectedBrands={filters.brands}
            selectedPriceRange={filters.priceRange}
            selectedSizes={filters.sizes}
            onCategoryChange={handleCategoryChange}
            onBrandChange={handleBrandChange}
            onPriceRangeChange={handlePriceRangeChange}
            onSizeChange={handleSizeChange}
            onClearFilters={handleClearFilters}
          />
        </Box>
      </Drawer>
    </Box>
  );
};

export default ProductsPage;