// Form validation utilities

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return 'Email is required';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

// Password validation
export const validatePassword = (password) => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  return null;
};

// Name validation
export const validateName = (name, fieldName = 'Name') => {
  if (!name) {
    return `${fieldName} is required`;
  }
  if (name.length < 2) {
    return `${fieldName} must be at least 2 characters long`;
  }
  if (name.length > 50) {
    return `${fieldName} cannot exceed 50 characters`;
  }
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return `${fieldName} can only contain letters and spaces`;
  }
  return null;
};

// Phone validation (Indian format)
export const validatePhone = (phone) => {
  if (!phone) {
    return 'Phone number is required';
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    return 'Phone number must be exactly 10 digits';
  }
  return null;
};

// Postal code validation (Indian format)
export const validatePostalCode = (postalCode) => {
  if (!postalCode) {
    return 'Postal code is required';
  }
  if (!/^[0-9]{6}$/.test(postalCode)) {
    return 'Postal code must be exactly 6 digits';
  }
  return null;
};

// Address validation
export const validateAddress = (address) => {
  const errors = {};

  const firstNameError = validateName(address.firstName, 'First name');
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = validateName(address.lastName, 'Last name');
  if (lastNameError) errors.lastName = lastNameError;

  const emailError = validateEmail(address.email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(address.phone);
  if (phoneError) errors.phone = phoneError;

  if (!address.street) {
    errors.street = 'Street address is required';
  } else if (address.street.length > 200) {
    errors.street = 'Street address cannot exceed 200 characters';
  }

  if (!address.city) {
    errors.city = 'City is required';
  } else if (address.city.length > 100) {
    errors.city = 'City cannot exceed 100 characters';
  } else if (!/^[a-zA-Z\s]+$/.test(address.city)) {
    errors.city = 'City can only contain letters and spaces';
  }

  if (!address.state) {
    errors.state = 'State is required';
  } else if (address.state.length > 100) {
    errors.state = 'State cannot exceed 100 characters';
  } else if (!/^[a-zA-Z\s]+$/.test(address.state)) {
    errors.state = 'State can only contain letters and spaces';
  }

  const postalCodeError = validatePostalCode(address.postalCode);
  if (postalCodeError) errors.postalCode = postalCodeError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Registration form validation
export const validateRegistrationForm = (formData) => {
  const errors = {};

  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.password = passwordError;

  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  const firstNameError = validateName(formData.firstName, 'First name');
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = validateName(formData.lastName, 'Last name');
  if (lastNameError) errors.lastName = lastNameError;

  // Phone is optional for registration
  if (formData.phone) {
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Login form validation
export const validateLoginForm = (formData) => {
  const errors = {};

  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  if (!formData.password) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Profile update validation
export const validateProfileForm = (formData) => {
  const errors = {};

  const firstNameError = validateName(formData.firstName, 'First name');
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = validateName(formData.lastName, 'Last name');
  if (lastNameError) errors.lastName = lastNameError;

  // Phone is optional
  if (formData.phone) {
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;
  }

  // Date of birth validation (optional)
  if (formData.dateOfBirth) {
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (birthDate > today) {
      errors.dateOfBirth = 'Date of birth cannot be in the future';
    } else if (age < 13) {
      errors.dateOfBirth = 'You must be at least 13 years old';
    } else if (age > 120) {
      errors.dateOfBirth = 'Please enter a valid date of birth';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Search query validation
export const validateSearchQuery = (query) => {
  if (!query) {
    return 'Search query is required';
  }
  if (query.length < 1) {
    return 'Search query must be at least 1 character long';
  }
  if (query.length > 100) {
    return 'Search query cannot exceed 100 characters';
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(query)) {
    return 'Search query contains invalid characters';
  }
  return null;
};

// Quantity validation
export const validateQuantity = (quantity) => {
  if (!quantity) {
    return 'Quantity is required';
  }
  const num = parseInt(quantity);
  if (isNaN(num)) {
    return 'Quantity must be a number';
  }
  if (num < 1) {
    return 'Quantity must be at least 1';
  }
  if (num > 10) {
    return 'Quantity cannot exceed 10';
  }
  return null;
};

// Size validation
export const validateSize = (size) => {
  const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42'];
  if (!size) {
    return 'Size is required';
  }
  if (!validSizes.includes(size)) {
    return 'Please select a valid size';
  }
  return null;
};

// Generic field validation
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};

// Length validation
export const validateLength = (value, min, max, fieldName) => {
  if (value && value.length < min) {
    return `${fieldName} must be at least ${min} characters long`;
  }
  if (value && value.length > max) {
    return `${fieldName} cannot exceed ${max} characters`;
  }
  return null;
};

// Number range validation
export const validateRange = (value, min, max, fieldName) => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (num > max) {
    return `${fieldName} cannot exceed ${max}`;
  }
  return null;
};

// Debounced validation for real-time feedback
export const createDebouncedValidator = (validator, delay = 300) => {
  let timeoutId;
  
  return (value, callback) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const error = validator(value);
      callback(error);
    }, delay);
  };
};

export default {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validatePostalCode,
  validateAddress,
  validateRegistrationForm,
  validateLoginForm,
  validateProfileForm,
  validateSearchQuery,
  validateQuantity,
  validateSize,
  validateRequired,
  validateLength,
  validateRange,
  createDebouncedValidator
};