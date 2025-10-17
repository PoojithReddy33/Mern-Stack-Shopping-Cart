import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  CircularProgress,
  Popper,
  ClickAwayListener
} from '@mui/material';
import {
  Search,
  Clear,
  TrendingUp,
  Category,
  Business
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../../services/api';

const SearchBar = ({ 
  onSearch, 
  placeholder = "Search for products, brands, categories...",
  showSuggestions = true,
  autoFocus = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [popularTerms, setPopularTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch popular search terms on mount
  useEffect(() => {
    const fetchPopularTerms = async () => {
      try {
        const response = await productsAPI.searchProducts('popular');
        if (response.data.success) {
          setPopularTerms(response.data.data.popularTerms || []);
        }
      } catch (error) {
        console.error('Error fetching popular terms:', error);
      }
    };

    fetchPopularTerms();
  }, []);

  // Fetch suggestions when search term changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchTerm.trim().length >= 2 && showSuggestions) {
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const response = await productsAPI.searchProducts(`suggestions?q=${encodeURIComponent(searchTerm)}`);
          if (response.data.success) {
            setSuggestions(response.data.data.suggestions || []);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setLoading(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, showSuggestions]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    setAnchorEl(event.currentTarget);
    setShowDropdown(true);
  };

  const handleSearch = (term = searchTerm) => {
    if (term.trim()) {
      setShowDropdown(false);
      if (onSearch) {
        onSearch(term.trim());
      } else {
        navigate(`/products?search=${encodeURIComponent(term.trim())}`);
      }
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    } else if (event.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.text);
    handleSearch(suggestion.text);
  };

  const handlePopularTermClick = (term) => {
    setSearchTerm(term.term);
    handleSearch(term.term);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowDropdown(false);
    if (searchRef.current) {
      searchRef.current.focus();
    }
  };

  const handleFocus = (event) => {
    setAnchorEl(event.currentTarget);
    setShowDropdown(true);
  };

  const handleClickAway = () => {
    setShowDropdown(false);
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'category':
        return <Category fontSize="small" />;
      case 'brand':
        return <Business fontSize="small" />;
      default:
        return <Search fontSize="small" />;
    }
  };

  const shouldShowDropdown = showDropdown && (suggestions.length > 0 || popularTerms.length > 0 || loading);

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <TextField
          ref={searchRef}
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          autoFocus={autoFocus}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {loading && <CircularProgress size={20} />}
                {searchTerm && !loading && (
                  <IconButton
                    onClick={handleClear}
                    edge="end"
                    size="small"
                  >
                    <Clear />
                  </IconButton>
                )}
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main'
                }
              }
            }
          }}
        />

        {/* Suggestions Dropdown */}
        <Popper
          open={shouldShowDropdown}
          anchorEl={anchorEl}
          placement="bottom-start"
          style={{ width: anchorEl?.offsetWidth, zIndex: 1300 }}
        >
          <Paper 
            elevation={8} 
            sx={{ 
              maxHeight: 400, 
              overflow: 'auto',
              mt: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <>
                <Box sx={{ px: 2, py: 1, backgroundColor: 'grey.50' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    SUGGESTIONS
                  </Typography>
                </Box>
                <List dense>
                  {suggestions.map((suggestion, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton onClick={() => handleSuggestionClick(suggestion)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          {getSuggestionIcon(suggestion.type)}
                          <ListItemText 
                            primary={suggestion.text}
                            secondary={suggestion.type === 'category' ? 'Category' : suggestion.type === 'brand' ? 'Brand' : 'Product'}
                          />
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Popular Search Terms */}
            {popularTerms.length > 0 && suggestions.length === 0 && !loading && (
              <>
                <Box sx={{ px: 2, py: 1, backgroundColor: 'grey.50' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    POPULAR SEARCHES
                  </Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {popularTerms.slice(0, 8).map((term, index) => (
                      <Chip
                        key={index}
                        label={term.term}
                        size="small"
                        icon={<TrendingUp fontSize="small" />}
                        onClick={() => handlePopularTermClick(term)}
                        clickable
                        variant="outlined"
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText'
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            )}

            {/* No Results */}
            {!loading && suggestions.length === 0 && searchTerm.length >= 2 && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No suggestions found for "{searchTerm}"
                </Typography>
              </Box>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default SearchBar;