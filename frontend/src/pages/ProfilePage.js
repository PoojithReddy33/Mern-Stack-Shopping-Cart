import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  LocationOn,
  Person
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const ProfilePage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: ''
  });
  const [addresses, setAddresses] = useState([]);
  const [addressDialog, setAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    type: 'both',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false
  });

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        phone: user.profile?.phone || '',
        dateOfBirth: user.profile?.dateOfBirth ? user.profile.dateOfBirth.split('T')[0] : ''
      });
      setAddresses(user.addresses || []);
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.updateProfile({
        profile: profileData
      });

      if (response.data.success) {
        setSuccess('Profile updated successfully');
      }
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      if (editingAddress) {
        response = await authAPI.updateProfile({ addresses: { update: { id: editingAddress._id, ...addressForm } } });
      } else {
        response = await authAPI.updateProfile({ addresses: { add: addressForm } });
      }

      if (response.data.success) {
        setAddresses(response.data.data.user.addresses);
        setAddressDialog(false);
        setEditingAddress(null);
        setAddressForm({
          type: 'both',
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'India',
          isDefault: false
        });
        setSuccess(editingAddress ? 'Address updated successfully' : 'Address added successfully');
      }
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      const response = await authAPI.updateProfile({ addresses: { remove: addressId } });
      if (response.data.success) {
        setAddresses(response.data.data.user.addresses);
        setSuccess('Address deleted successfully');
      }
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to delete address');
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      type: address.type,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault
    });
    setAddressDialog(true);
  };

  if (!isAuthenticated) {
    return (
      <Alert severity="warning">
        Please log in to view your profile.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Personal Information" />
          <Tab label="Addresses" />
        </Tabs>

        {/* Personal Information Tab */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleProfileSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Person color="primary" />
                    <Typography variant="h6">Personal Information</Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={user?.email || ''}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    placeholder="10-digit phone number"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={handleProfileChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{ minWidth: 120 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Update Profile'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Box>
        )}

        {/* Addresses Tab */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LocationOn color="primary" />
                <Typography variant="h6">Saved Addresses</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddressDialog(true)}
              >
                Add Address
              </Button>
            </Box>

            {addresses.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No addresses saved yet
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setAddressDialog(true)}
                  sx={{ mt: 2 }}
                >
                  Add Your First Address
                </Button>
              </Box>
            ) : (
              <List>
                {addresses.map((address, index) => (
                  <React.Fragment key={address._id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {address.type.charAt(0).toUpperCase() + address.type.slice(1)} Address
                            </Typography>
                            {address.isDefault && (
                              <Chip label="Default" size="small" color="primary" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {address.street}, {address.city}, {address.state} {address.postalCode}, {address.country}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => handleEditAddress(address)}>
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteAddress(address._id)}>
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < addresses.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}
      </Paper>

      {/* Address Dialog */}
      <Dialog open={addressDialog} onClose={() => setAddressDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAddress ? 'Edit Address' : 'Add New Address'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Address Type"
                  name="type"
                  value={addressForm.type}
                  onChange={handleAddressChange}
                  SelectProps={{ native: true }}
                >
                  <option value="both">Both Shipping & Billing</option>
                  <option value="shipping">Shipping Only</option>
                  <option value="billing">Billing Only</option>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  name="street"
                  value={addressForm.street}
                  onChange={handleAddressChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={addressForm.city}
                  onChange={handleAddressChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State"
                  name="state"
                  value={addressForm.state}
                  onChange={handleAddressChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  name="postalCode"
                  value={addressForm.postalCode}
                  onChange={handleAddressChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  name="country"
                  value={addressForm.country}
                  onChange={handleAddressChange}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddressDialog(false)}>Cancel</Button>
          <Button onClick={handleAddressSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : (editingAddress ? 'Update' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;