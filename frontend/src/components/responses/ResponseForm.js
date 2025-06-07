import React, { useState } from 'react';
import axios from 'axios';
import { Box, TextField, Alert, Typography } from '@mui/material';
import LoadingButton from '../form/LoadingButton';
import { useAuth } from '../../hooks/useAuth';

const ResponseForm = ({ surveyId, onResponseSubmit }) => {
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`/api/surveys/${surveyId}/responses`, {
        text: responseText,
      });
      onResponseSubmit(response.data);
      setResponseText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        loading={loading}
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
  );
};

export default ResponseForm; 