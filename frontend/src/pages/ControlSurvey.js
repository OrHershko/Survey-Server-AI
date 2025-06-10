import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  Button,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { surveyService } from '../services';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ToastNotification from '../components/common/ToastNotification';
import ResponseList from '../components/responses/ResponseList';
import SurveySummary from '../components/ai/SurveySummary';
import ResponseValidation from '../components/ai/ResponseValidation';
import { useAuth } from '../hooks/useAuth';
import CountdownTimer from '../components/common/CountdownTimer';
import EditResponseModal from '../components/responses/EditResponseModal';

const ControlSurvey = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { user } = useAuth();
  const [editingResponse, setEditingResponse] = useState(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  const handleSummaryUpdate = (updatedSurvey) => {
    setSurvey(updatedSurvey);
  };

  const handleDeleteResponse = async (responseId) => {
    try {
      await surveyService.deleteResponse(id, responseId);
      
      // Update the survey state to remove the deleted response
      setSurvey((prevSurvey) => ({
        ...prevSurvey,
        responses: (prevSurvey.responses || []).filter((r) => r._id !== responseId),
      }));
      
      setSuccess('Response deleted successfully.');
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error('Error deleting response:', err);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to delete response.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.status === 403) {
        errorMessage = 'You are not authorized to delete this response.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Response not found. It may have already been deleted.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network and try again.';
      }
      
      setError(errorMessage);
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
        
        // Check if user is the creator
        if (!user || survey.creator._id !== user.id) {
          setError('You are not authorized to control this survey.');
          return;
        }
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
    return <LoadingSpinner message="Loading survey control panel..." />;
  }

  if (!survey || error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error || 'Survey not found.'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/my-surveys')}
          sx={{ mt: 2 }}
        >
          Back to My Surveys
        </Button>
      </Container>
    );
  }

  const isActive = !survey.closed && new Date(survey.expiryDate) > new Date();
  const responseCount = survey.responseCount || survey.responses?.length || 0;

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

      {/* Header */}
      <Box sx={{ mt: 4, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/my-surveys')}
          sx={{ mb: 2 }}
        >
          Back to My Surveys
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          Survey Control Panel
        </Typography>
      </Box>

      {/* Survey Overview */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              {survey.title}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {survey.area}
            </Typography>
          </Box>
          <Chip
            label={isActive ? 'Active' : 'Closed'}
            color={isActive ? 'success' : 'default'}
            icon={isActive ? <CheckCircleIcon /> : <CancelIcon />}
            clickable={false}
            onClick={() => {}}
          />
        </Box>

        <Typography variant="body1" sx={{ mb: 2 }}>
          <strong>Question:</strong> {survey.question}
        </Typography>

        {survey.guidelines && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Guidelines</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              {survey.guidelines}
            </Typography>
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
          <CountdownTimer expiryDate={survey.expiryDate} closed={survey.closed} />
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {responseCount}
                </Typography>
                <Typography color="text.secondary">
                  Total Responses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <ScheduleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" component="div">
                  {new Date(survey.createdAt).toLocaleDateString()}
                </Typography>
                <Typography color="text.secondary">
                  Created Date
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <ScheduleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" component="div">
                  {new Date(survey.expiryDate).toLocaleDateString()}
                </Typography>
                <Typography color="text.secondary">
                  Expiry Date
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* Responses Management */}
      {responseCount > 0 ? (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Response Management
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Owner Privileges:</strong> As the survey creator, you can delete any response. 
              Participants can only edit or delete their own responses. Use this power responsibly.
            </Typography>
          </Alert>
          <ResponseList
            responses={survey.responses}
            onDelete={handleDeleteResponse}
            onEdit={handleEditResponse}
            currentUserId={user?.id}
            creatorId={survey.creator._id}
          />
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No responses yet
          </Typography>
          <Typography color="text.secondary">
            Share your survey to start collecting responses.
          </Typography>
        </Paper>
      )}

      <Divider sx={{ my: 4 }} />

      {/* AI Features */}
      {responseCount > 0 && (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              AI Analysis
            </Typography>
            <SurveySummary survey={survey} onSummaryUpdate={handleSummaryUpdate} currentUserId={user?.id} />
          </Box>

          <Box sx={{ mb: 4 }}>
            <ResponseValidation surveyId={survey._id} />
          </Box>
        </>
      )}
    </Container>
  );
};

export default ControlSurvey; 