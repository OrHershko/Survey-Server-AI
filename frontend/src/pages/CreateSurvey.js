import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Paper } from '@mui/material';
import { surveyService } from '../services';
import ValidatedTextField from '../components/form/ValidatedTextField';
import LoadingButton from '../components/form/LoadingButton';
import DateTimePicker from '../components/form/DateTimePicker';
import ToastNotification from '../components/common/ToastNotification';
import dayjs from 'dayjs';

const CreateSurvey = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    area: '',
    question: '',
    guidelines: '',
    summaryInstructions: '',
  });
  const [expiryDate, setExpiryDate] = useState(dayjs().add(7, 'day'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const surveyData = { ...formData, expiryDate: expiryDate.toISOString() };
      const response = await surveyService.createSurvey(surveyData);
      
      // Show success message
      setShowSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Failed to create survey. Please check your input and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create a New Survey
        </Typography>
        <form onSubmit={handleSubmit}>
          <ValidatedTextField
            name="title"
            label="Survey Title"
            value={formData.title}
            onChange={handleChange}
            required
          />
          <ValidatedTextField
            name="area"
            label="Survey Area (e.g., Technology, Health)"
            value={formData.area}
            onChange={handleChange}
            required
          />
          <ValidatedTextField
            name="question"
            label="Main Survey Question"
            value={formData.question}
            onChange={handleChange}
            required
            multiline
            rows={4}
          />
          <ValidatedTextField
            name="guidelines"
            label="Response Guidelines"
            value={formData.guidelines}
            onChange={handleChange}
            multiline
            rows={6}
            helperText="Provide clear instructions for participants on how to frame their responses."
          />
          <ValidatedTextField
            name="summaryInstructions"
            label="AI Summary Instructions"
            value={formData.summaryInstructions}
            onChange={handleChange}
            multiline
            rows={4}
            helperText="Guide the AI on how to summarize the responses (e.g., focus on key themes, provide a list of pros and cons)."
          />
          <DateTimePicker
            label="Survey Expiry Date"
            value={expiryDate}
            onChange={(newValue) => setExpiryDate(newValue)}
          />
          <Box sx={{ mt: 3 }}>
            <LoadingButton
              type="submit"
              variant="contained"
              color="primary"
              isLoading={loading}
            >
              Create Survey
            </LoadingButton>
          </Box>
        </form>
      </Paper>
      
      <ToastNotification
        open={showSuccess}
        message="Survey created successfully! Redirecting to dashboard..."
        severity="success"
        onClose={handleSuccessClose}
      />
      
      <ToastNotification
        open={!!error}
        message={error}
        severity="error"
        onClose={() => setError(null)}
      />
    </Container>
  );
};

export default CreateSurvey; 