import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box, Paper, Divider, Alert } from '@mui/material';
import { surveyService } from '../services';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ToastNotification from '../components/common/ToastNotification';
import ResponseForm from '../components/responses/ResponseForm';
import ResponseList from '../components/responses/ResponseList';
import SurveySummary from '../components/ai/SurveySummary';
import ResponseValidation from '../components/ai/ResponseValidation';
import { useAuth } from '../hooks/useAuth';
import CountdownTimer from '../components/common/CountdownTimer';
import EditResponseModal from '../components/responses/EditResponseModal';

const SurveyDetail = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [editingResponse, setEditingResponse] = useState(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [success, setSuccess] = useState(null);

  // Check if user has responded - use backend-provided field for non-creators, or check responses array for creators
  const userHasResponded = user && survey ? 
    (survey.userHasResponded !== undefined ? survey.userHasResponded : 
     survey.responses?.some(r => r.user?._id === user.id)) : false;

  const handleNewResponse = (responseData) => {
    // The response from the backend has user as an ID, but we need to populate it
    // with current user info to match the format of other responses
    const responseWithUser = {
      ...responseData.response, // Extract the response object from the backend response
      user: {
        _id: user.id,
        username: user.username || user.email || 'You'
      }
    };

    setSurvey((prevSurvey) => ({
      ...prevSurvey,
      responses: [...(prevSurvey.responses || []), responseWithUser],
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
        responses: (prevSurvey.responses || []).filter((r) => r._id !== responseId),
      }));
    } catch (err) {
      setError('Failed to delete response.');
      console.error(err);
    }
  };

  const handleEditResponse = (response) => {
    setEditingResponse(response);
    setEditModalOpen(true);
  };

  const handleUpdateResponse = async (updatedResponse) => {
    try {
      await surveyService.updateResponse(id, updatedResponse._id, { text: updatedResponse.text });
      setSurvey((prevSurvey) => ({
        ...prevSurvey,
        responses: (prevSurvey.responses || []).map((r) =>
          r._id === updatedResponse._id ? updatedResponse : r
        ),
      }));
      setSuccess('Response updated successfully.');
      setEditModalOpen(false);
      setEditingResponse(null);
    } catch (err) {
      console.error('Error updating response:', err);
      setError('Failed to update response.');
    }
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
  }, [id, user]);

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
      <ToastNotification
        open={!!success}
        message={success}
        severity="success"
        onClose={() => setSuccess(null)}
      />
      <EditResponseModal
        open={isEditModalOpen}
        response={editingResponse}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdateResponse}
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

          {user && !survey.closed && !userHasResponded && (
            <ResponseForm surveyId={survey._id} onResponseSubmit={handleNewResponse} />
          )}

          {user && userHasResponded && (
             <Alert severity="info" sx={{ my: 2 }}>
                You have already submitted a response for this survey. You can edit your existing response if needed.
            </Alert>
          )}

          {survey.closed && (
            <Alert severity="warning" sx={{ my: 2 }}>
              This survey is closed and no longer accepting responses.
            </Alert>
          )}

          {user && survey && user.id === survey.creator._id && (
            <ResponseList 
              responses={survey.responses || []}
              onEdit={handleEditResponse}
              onDelete={handleDeleteResponse}
              currentUserId={user?.id}
              creatorId={survey.creator._id}
            />
          )}

          {(survey.summary?.isVisible || (user && user.id === survey.creator._id)) && (
            <SurveySummary survey={survey} onSummaryUpdate={handleSummaryUpdate} currentUserId={user?.id} />
          )}

          {user && user.id === survey.creator._id && (
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