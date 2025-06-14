import React, { useState } from 'react';
import { Box, TextField, Alert, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '../../services';
import LoadingButton from '../form/LoadingButton';
import ToastNotification from '../common/ToastNotification';
import { useAuth } from '../../hooks/useAuth';

const ResponseForm = ({ surveyId, onResponseSubmit }) => {
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await surveyService.submitResponse(surveyId, {
        text: responseText,
      });
      onResponseSubmit(response);
      setResponseText('');
      
      // Show success message
      setShowSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Response submission error:', err);
      
      // More robust error handling
      let errorMessage = 'Failed to submit response.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network and try again.';
      } else if (err.code === 'NETWORK_ERROR' || err.request) {
        errorMessage = 'Unable to connect to the server. Please check if the backend is running.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate('/dashboard');
  };

  return (
    <>
      <ToastNotification
        open={showSuccess}
        message="Response submitted successfully! Redirecting to dashboard..."
        severity="success"
        onClose={handleSuccessClose}
      />
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <Typography variant="h6">Submit Your Response</Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Your Response"
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          variant="outlined"
          required
          sx={{ mb: 2 }}
        />
        <LoadingButton
          type="submit"
          isLoading={loading}
          variant="contained"
          color="primary"
          disabled={!user}
        >
          Submit
        </LoadingButton>
        {!user && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            You must be logged in to respond.
          </Typography>
        )}
      </Box>
    </>
  );
};

export default ResponseForm; 