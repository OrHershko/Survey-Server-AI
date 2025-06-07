import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import LoadingButton from '../form/LoadingButton';
import ToastNotification from '../common/ToastNotification';

const ResponseValidation = ({ surveyId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationResults, setValidationResults] = useState(null);

  const handleValidateResponses = async () => {
    setLoading(true);
    setError(null);
    setValidationResults(null);
    try {
      const response = await axios.post(`/api/surveys/${surveyId}/validate-responses`);
      setValidationResults(response.data);
    } catch (err) {
      setError('Failed to validate responses.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        AI-Powered Response Validation
      </Typography>
      <ToastNotification
        open={!!error}
        message={error}
        severity="error"
        onClose={() => setError(null)}
      />
      <Paper sx={{ p: 3, mt: 2 }}>
        <LoadingButton
          onClick={handleValidateResponses}
          isLoading={loading}
          variant="contained"
        >
          Validate All Responses
        </LoadingButton>

        {validationResults && (
          <Box sx={{ mt: 3 }}>
            {validationResults.problematicResponses.length > 0 ? (
              <>
                <Typography variant="h6">Validation Issues Found:</Typography>
                <List>
                  {validationResults.problematicResponses.map((item) => (
                    <ListItem key={item.responseId} divider>
                      <ListItemText
                        primary={`Response: "${item.text}"`}
                        secondary={`Reason: ${item.reason}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            ) : (
              <Alert severity="success">
                All responses seem to comply with the guidelines.
              </Alert>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ResponseValidation; 