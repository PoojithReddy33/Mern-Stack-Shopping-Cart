import React, { useState, useCallback } from 'react';
import {
  TextField,
  FormControl,
  FormLabel,
  FormHelperText,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Info,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { createDebouncedValidator } from '../../utils/validation';

const FormField = ({
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder,
  multiline = false,
  rows = 1,
  maxLength,
  validator,
  validateOnChange = false,
  validateOnBlur = true,
  showValidationIcon = false,
  tooltip,
  startAdornment,
  endAdornment,
  autoComplete,
  fullWidth = true,
  margin = 'normal',
  variant = 'outlined',
  size = 'medium',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [isValid, setIsValid] = useState(false);

  // Create debounced validator
  const debouncedValidator = useCallback(
    createDebouncedValidator((val) => {
      if (validator) {
        return validator(val);
      }
      return null;
    }, 300),
    [validator]
  );

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Call parent onChange
    if (onChange) {
      onChange(e);
    }

    // Validate on change if enabled
    if (validateOnChange && validator && newValue) {
      setIsValidating(true);
      debouncedValidator(newValue, (validationResult) => {
        setValidationError(validationResult);
        setIsValid(!validationResult);
        setIsValidating(false);
      });
    } else {
      setValidationError(null);
      setIsValid(false);
    }
  };

  const handleBlur = (e) => {
    // Call parent onBlur
    if (onBlur) {
      onBlur(e);
    }

    // Validate on blur if enabled
    if (validateOnBlur && validator && e.target.value) {
      const validationResult = validator(e.target.value);
      setValidationError(validationResult);
      setIsValid(!validationResult);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Determine field type
  const fieldType = type === 'password' && showPassword ? 'text' : type;

  // Determine error state
  const hasError = !!(error || validationError);
  const displayHelperText = error || validationError || helperText;

  // Build start adornment
  let startAdornmentElement = startAdornment;
  if (tooltip && !startAdornment) {
    startAdornmentElement = (
      <InputAdornment position="start">
        <Tooltip title={tooltip} arrow>
          <Info color="action" />
        </Tooltip>
      </InputAdornment>
    );
  }

  // Build end adornment
  let endAdornmentElement = endAdornment;
  
  if (type === 'password') {
    endAdornmentElement = (
      <InputAdornment position="end">
        <IconButton
          onClick={togglePasswordVisibility}
          edge="end"
          aria-label="toggle password visibility"
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
        {endAdornment}
      </InputAdornment>
    );
  } else if (showValidationIcon && (isValid || hasError) && !endAdornment) {
    endAdornmentElement = (
      <InputAdornment position="end">
        {isValidating ? (
          <div style={{ width: 24, height: 24 }} /> // Placeholder for loading
        ) : isValid ? (
          <CheckCircle color="success" />
        ) : hasError ? (
          <Error color="error" />
        ) : null}
      </InputAdornment>
    );
  }

  return (
    <FormControl fullWidth={fullWidth} margin={margin} error={hasError}>
      <TextField
        name={name}
        label={label}
        type={fieldType}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={hasError}
        helperText={displayHelperText}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        multiline={multiline}
        rows={multiline ? rows : undefined}
        inputProps={{
          maxLength: maxLength,
          autoComplete: autoComplete
        }}
        InputProps={{
          startAdornment: startAdornmentElement,
          endAdornment: endAdornmentElement
        }}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        {...props}
      />
    </FormControl>
  );
};

export default FormField;