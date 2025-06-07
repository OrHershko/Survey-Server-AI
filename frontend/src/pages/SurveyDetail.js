import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import { surveyService } from '../services';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ToastNotification from '../components/common/ToastNotification';
import ResponseForm from '../components/responses/ResponseForm';
import ResponseList from '../components/responses/ResponseList';
import SurveySummary from '../components/ai/SurveySummary';
import ResponseValidation from '../components/ai/ResponseValidation';
import { useAuth } from '../hooks/useAuth';
import CountdownTimer from '../components/common/CountdownTimer';

const SurveyDetail = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const handleNewResponse = (response) => {
    setSurvey((prevSurvey) => ({
      ...prevSurvey,
      responses: [...prevSurvey.responses, response],
    }));
  };

  const handleSummaryUpdate = (updatedSurvey) => {
    setSurvey(updatedSurvey);
  };

  const handleDeleteResponse = async (responseId) => {
    try {
      await surveyService.deleteResponse(id, responseId);
      setSurvey((prevSurvey) => ({
        ...prevSurvey,
        responses: prevSurvey.responses.filter((r) => r._id !== responseId),
      }));
    } catch (err) {
      setError('Failed to delete response.');
      console.error(err);
    }
  };

  const handleEditResponse = (response) => {
    // For now, we'll just log this. A modal would be used in a full implementation.
    console.log('Editing response:', response);
  };

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const survey = await surveyService.getSurveyById(id);
        setSurvey(survey);
      } catch (err) {
        setError('Failed to fetch survey details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading survey..." />;
  }

  return (
    <Container>
      <ToastNotification
        open={!!error}
        message={error}
        severity="error"
        onClose={() => setError(null)}
      />
      {survey ? (
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {survey.title}
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {survey.area}
          </Typography>
          <Typography variant="body1" sx={{ my: 2 }}>
            <strong>Question:</strong> {survey.question}
          </Typography>
          <Box sx={{ my: 3 }}>
            <Typography variant="h6">Guidelines</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {survey.guidelines}
            </Typography>
          </Box>
          <CountdownTimer expiryDate={survey.expiryDate} />
          
          <Divider sx={{ my: 4 }} />

          {user && (
            <ResponseForm surveyId={survey._id} onResponseSubmit={handleNewResponse} />
          )}

          {user && survey && user._id === survey.creator._id && (
            <ResponseList 
              responses={survey.responses}
              onEdit={handleEditResponse}
              onDelete={handleDeleteResponse}
            />
          )}

          {(survey.isSummaryPublic || (user && user._id === survey.creator._id)) && (
            <SurveySummary survey={survey} onSummaryUpdate={handleSummaryUpdate} />
          )}

          {user && user._id === survey.creator._id && (
            <ResponseValidation surveyId={survey._id} />
          )}
        </Paper>
      ) : (
        !error && <Typography>Survey not found.</Typography>
      )}
    </Container>
  );
};

export default SurveyDetail; 