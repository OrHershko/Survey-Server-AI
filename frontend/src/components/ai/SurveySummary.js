import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { aiService } from '../../services';
import LoadingButton from '../form/LoadingButton';
import ToastNotification from '../common/ToastNotification';

const SurveySummary = ({ survey, onSummaryUpdate, currentUserId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.generateSurveySummary(survey._id);
      if (onSummaryUpdate) {
        onSummaryUpdate({
          ...survey,
          summary: response.summary
        });
      }
    } catch (err) {
      setError('Failed to generate summary.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (isVisible) => {
    setUpdatingVisibility(true);
    try {
      const response = await aiService.toggleSummaryVisibility(survey._id, isVisible);
      if (onSummaryUpdate) {
        onSummaryUpdate({
          ...survey,
          summary: {
            ...survey.summary,
            isVisible
          }
        });
      }
    } catch (err) {
      setError('Failed to update summary visibility.');
      console.error(err);
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const responseCount = survey.responseCount || survey.responses?.length || 0;
  const isCreator = currentUserId && survey.creator._id === currentUserId;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        AI-Generated Summary
      </Typography>
      
      <ToastNotification
        open={!!error}
        message={error}
        severity="error"
        onClose={() => setError(null)}
      />

      <Paper sx={{ p: 3, mt: 2 }}>
        {survey.summary?.text ? (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Summary</Typography>
              {isCreator && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={survey.summary?.isVisible || false}
                        onChange={(e) => handleToggleVisibility(e.target.checked)}
                        disabled={updatingVisibility}
                      />
                    }
                    label="Public Visibility"
                  />
                  <LoadingButton
                    onClick={handleGenerateSummary}
                    isLoading={loading}
                    variant="outlined"
                    size="small"
                  >
                    Regenerate
                  </LoadingButton>
                </Box>
              )}
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {survey.summary.text}
            </Typography>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Generated on: {new Date(survey.summary.generatedAt).toLocaleString()}
            </Typography>
          </Box>
        ) : responseCount > 0 && isCreator ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Generate an AI summary of all responses ({responseCount} responses available)
            </Typography>
            <LoadingButton
              onClick={handleGenerateSummary}
              isLoading={loading}
              variant="contained"
            >
              Generate Summary
            </LoadingButton>
          </Box>
        ) : (
          <Alert severity="info">
            No responses available yet. A summary will be generated once responses are submitted.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default SurveySummary; 