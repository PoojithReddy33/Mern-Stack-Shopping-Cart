const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while fetching profile' }
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { profile } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Update profile fields
    if (profile.firstName) user.profile.firstName = profile.firstName;
    if (profile.lastName) user.profile.lastName = profile.lastName;
    if (profile.phone !== undefined) user.profile.phone = profile.phone;
    if (profile.dateOfBirth !== undefined) user.profile.dateOfBirth = profile.dateOfBirth;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validationErrors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while updating profile' }
    });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/profile/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: { message: 'Current password is incorrect' }
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validationErrors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while changing password' }
    });
  }
};

// @desc    Add user address
// @route   POST /api/auth/profile/addresses
// @access  Private
const addAddress = async (req, res) => {
  try {
    const addressData = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // If this is set as default, unset other default addresses
    if (addressData.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Add new address
    user.addresses.push(addressData);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Add address error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validationErrors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while adding address' }
    });
  }
};

// @desc    Update user address
// @route   PUT /api/auth/profile/addresses/:addressId
// @access  Private
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const addressData = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    const address = user.addresses.id(addressId);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        error: { message: 'Address not found' }
      });
    }

    // If this is set as default, unset other default addresses
    if (addressData.isDefault) {
      user.addresses.forEach(addr => {
        if (addr._id.toString() !== addressId) {
          addr.isDefault = false;
        }
      });
    }

    // Update address fields
    Object.keys(addressData).forEach(key => {
      if (addressData[key] !== undefined) {
        address[key] = addressData[key];
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Update address error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validationErrors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error while updating address' }
    });
  }
};

// @desc    Delete user address
// @route   DELETE /api/auth/profile/addresses/:addressId
// @access  Private
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    const address = user.addresses.id(addressId);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        error: { message: 'Address not found' }
      });
    }

    // Remove address
    user.addresses.pull(addressId);
    await user.save();

    res.json({
      success: true,
      message: 'Address deleted successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while deleting address' }
    });
  }
};

// @desc    Set default address
// @route   PUT /api/auth/profile/addresses/:addressId/default
// @access  Private
const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    const address = user.addresses.id(addressId);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        error: { message: 'Address not found' }
      });
    }

    // Unset all default addresses
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });

    // Set this address as default
    address.isDefault = true;
    await user.save();

    res.json({
      success: true,
      message: 'Default address updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while setting default address' }
    });
  }
};

// @desc    Deactivate user account
// @route   PUT /api/auth/profile/deactivate
// @access  Private
const deactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error while deactivating account' }
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  deactivateAccount
};