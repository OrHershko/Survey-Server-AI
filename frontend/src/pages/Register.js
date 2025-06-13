import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Link as MuiLink,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { apiNotifications } from '../utils/notifications';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { register, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();
  
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle auth context errors
  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const validateForm = () => {
    const errors = {};
    
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!registrationCode.trim()) {
      errors.registrationCode = 'Registration code is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLocalLoading(true);
    setLocalError('');
    setSuccess('');
    clearError();
    
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        registrationCode: registrationCode.trim(),
      });
      
      setSuccess('Registration successful! Redirecting to login...');
      apiNotifications.auth.registerSuccess();
      
      setTimeout(() => navigate('/login'), 2000);
      
    } catch (err) {
      const errorMessage = err.message || 'Failed to register. Please try again.';
      setLocalError(errorMessage);
      apiNotifications.auth.registerError(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  const isFormValid = !Object.keys(validationErrors).length && 
    username.trim() && email.trim() && password && confirmPassword && registrationCode.trim();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%', maxWidth: 500 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Join Our Community
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Create an account to start creating surveys and sharing your insights
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={localLoading}
              error={!!validationErrors.username}
              helperText={validationErrors.username}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={localLoading}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={localLoading}
              error={!!validationErrors.password}
              helperText={validationErrors.password || 'Minimum 6 characters'}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={localLoading}
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword}
            />
            
            <Box sx={{ position: 'relative' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="registrationCode"
                label="Registration Code"
                type="password"
                id="registrationCode"
                value={registrationCode}
                onChange={(e) => setRegistrationCode(e.target.value)}
                disabled={localLoading}
                error={!!validationErrors.registrationCode}
                helperText={validationErrors.registrationCode}
                InputProps={{
                  endAdornment: (
                    <Tooltip title="Contact your administrator for the registration code">
                      <IconButton edge="end" size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ),
                }}
              />
            </Box>
            
            {localError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {localError}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={localLoading || !isFormValid}
              size="large"
            >
              {localLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
            
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Already have an account?{' '}
                <MuiLink component={Link} to="/login" underline="hover">
                  Sign in here
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register; 