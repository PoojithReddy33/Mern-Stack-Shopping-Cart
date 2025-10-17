import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  TextField,
  Button,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Badge
} from '@mui/material';
import {
  ExpandMore,
  Clear,
  FilterList
} from '@mui/icons-material';

const CategoryFilter = ({
  categories = [],
  brands = [],
  priceRange = { min: 0, max: 10000 },
  selectedCategories = [],
  selectedBrands = [],
  selectedPriceRange = [0, 10000],
  selectedSizes = [],
  onCategoryChange,
  onBrandChange,
  onPriceRangeChange,
  onSizeChange,
  onClearFilters,
  availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42']
}) => {
  const [priceInput, setPriceInput] = useState(selectedPriceRange);

  const handleCategoryChange = (categoryName) => {
    if (onCategoryChange) {
      onCategoryChange(categoryName);
    }
  };

  const handleBrandChange = (brandName) => {
    if (onBrandChange) {
      onBrandChange(brandName);
    }
  };

  const handlePriceSliderChange = (event, newValue) => {
    setPriceInput(newValue);
  };

  const handlePriceSliderCommitted = (event, newValue) => {
    if (onPriceRangeChange) {
      onPriceRangeChange(newValue);
    }
  };

  const handleSizeChange = (size) => {
    if (onSizeChange) {
      onSizeChange(size);
    }
  };

  const handleClearFilters = () => {
    setPriceInput([priceRange.min, priceRange.max]);
    if (onClearFilters) {
      onClearFilters();
    }
  };

  const activeFiltersCount = selectedCategories.length + selectedBrands.length + selectedSizes.length + 
    (selectedPriceRange[0] !== priceRange.min || selectedPriceRange[1] !== priceRange.max ? 1 : 0);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Filter Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList />
          <Typography variant="h6">Filters</Typography>
          {activeFiltersCount > 0 && (
            <Badge badgeContent={activeFiltersCount} color="primary" />
          )}
        </Box>
        {activeFiltersCount > 0 && (
          <Button
            size="small"
            startIcon={<Clear />}
            onClick={handleClearFilters}
            sx={{ textTransform: 'none' }}
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Active Filters:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedCategories.map((category) => (
              <Chip
                key={category}
                label={category}
                onDelete={() => handleCategoryChange(category)}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
            {selectedBrands.map((brand) => (
              <Chip
                key={brand}
                label={brand}
                onDelete={() => handleBrandChange(brand)}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
            {selectedSizes.map((size) => (
              <Chip
                key={size}
                label={`Size ${size}`}
                onDelete={() => handleSizeChange(size)}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
            {(selectedPriceRange[0] !== priceRange.min || selectedPriceRange[1] !== priceRange.max) && (
              <Chip
                label={`₹${selectedPriceRange[0]} - ₹${selectedPriceRange[1]}`}
                onDelete={() => onPriceRangeChange([priceRange.min, priceRange.max])}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Categories Filter */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight="medium">
            Categories
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {categories.map((category) => (
              <ListItem key={category.name} disablePadding>
                <ListItemButton
                  onClick={() => handleCategoryChange(category.name)}
                  selected={selectedCategories.includes(category.name)}
                >
                  <ListItemText 
                    primary={category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                    secondary={`${category.count} items`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Brands Filter */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight="medium">
            Brands
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup>
            {brands.map((brand) => (
              <FormControlLabel
                key={brand.name}
                control={
                  <Checkbox
                    checked={selectedBrands.includes(brand.name)}
                    onChange={() => handleBrandChange(brand.name)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{brand.name}</span>
                    <span style={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      ({brand.count})
                    </span>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </AccordionDetails>
      </Accordion>

      {/* Price Range Filter */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight="medium">
            Price Range
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ px: 1 }}>
            <Slider
              value={priceInput}
              onChange={handlePriceSliderChange}
              onChangeCommitted={handlePriceSliderCommitted}
              valueLabelDisplay="auto"
              min={priceRange.min}
              max={priceRange.max}
              step={100}
              valueLabelFormat={(value) => `₹${value}`}
              marks={[
                { value: priceRange.min, label: `₹${priceRange.min}` },
                { value: priceRange.max, label: `₹${priceRange.max}` }
              ]}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                label="Min Price"
                type="number"
                size="small"
                value={priceInput[0]}
                onChange={(e) => {
                  const newValue = [parseInt(e.target.value) || 0, priceInput[1]];
                  setPriceInput(newValue);
                }}
                onBlur={() => onPriceRangeChange && onPriceRangeChange(priceInput)}
                InputProps={{ startAdornment: '₹' }}
              />
              <TextField
                label="Max Price"
                type="number"
                size="small"
                value={priceInput[1]}
                onChange={(e) => {
                  const newValue = [priceInput[0], parseInt(e.target.value) || priceRange.max];
                  setPriceInput(newValue);
                }}
                onBlur={() => onPriceRangeChange && onPriceRangeChange(priceInput)}
                InputProps={{ startAdornment: '₹' }}
              />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Size Filter */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight="medium">
            Size
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {availableSizes.map((size) => (
              <Chip
                key={size}
                label={size}
                onClick={() => handleSizeChange(size)}
                color={selectedSizes.includes(size) ? 'primary' : 'default'}
                variant={selectedSizes.includes(size) ? 'filled' : 'outlined'}
                size="small"
                clickable
              />
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default CategoryFilter;