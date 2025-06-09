import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Typography, 
  Box, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { surveyService } from '../services';
import SurveyCard from '../components/surveys/SurveyCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ToastNotification from '../components/common/ToastNotification';
import { useAuth } from '../hooks/useAuth';

const MySurveys = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [surveyToClose, setSurveyToClose] = useState(null);
  const [closingLoading, setClosingLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMySurveys = async () => {
      if (!user) return;
      try {
        // Get surveys created by the current user
        const response = await surveyService.getSurveys({ creator: user.id });
        setSurveys(response.surveys || response);
      } catch (err) {
        setError('Failed to fetch your surveys.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMySurveys();
  }, [user]);

  const handleCloseSurvey = (survey) => {
    setSurveyToClose(survey);
    setCloseDialogOpen(true);
  };

  const confirmCloseSurvey = async () => {
    if (!surveyToClose) return;

    try {
      setClosingLoading(true);
      
      // Close the survey
      await surveyService.closeSurvey(surveyToClose._id);
      
      // Update the survey in local state (no need to update expiry date)
      setSurveys(prev => prev.map(survey => 
        survey._id === surveyToClose._id 
          ? { ...survey, closed: true }
          : survey
      ));
      
      setSuccess(`Survey "${surveyToClose.title}" has been closed successfully.`);
      setCloseDialogOpen(false);
      setSurveyToClose(null);
    } catch (err) {
      setError(err.message || 'Failed to close survey.');
    } finally {
      setClosingLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setCloseDialogOpen(false);
    setSurveyToClose(null);
  };

  if (loading) {
    return <LoadingSpinner message="Fetching your surveys..." />;
  }

  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Surveys
        </Typography>
        
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
        
        <Grid container spacing={4}>
          {surveys.length > 0 ? (
            surveys.map((survey) => (
              <Grid item key={survey._id} xs={12} sm={6} md={4}>
                <Box sx={{ position: 'relative' }}>
                  <SurveyCard 
                    survey={survey} 
                    showControlButton={true} 
                    isCreator={true} 
                  />
                  {!survey.closed && (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="outlined"
                        color="warning"
                        size="small"
                        fullWidth
                        onClick={() => handleCloseSurvey(survey)}
                        disabled={closingLoading}
                      >
                        Close Survey
                      </Button>
                    </Box>
                  )}
                  {survey.closed && (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        fullWidth
                        disabled
                      >
                        Survey Closed
                      </Button>
                    </Box>
                  )}
                </Box>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Typography>You have not created any surveys yet.</Typography>
            </Grid>
          )}
        </Grid>

        {/* Close Survey Confirmation Dialog */}
        <Dialog
          open={closeDialogOpen}
          onClose={handleCloseDialog}
          aria-labelledby="close-survey-dialog-title"
          aria-describedby="close-survey-dialog-description"
        >
          <DialogTitle id="close-survey-dialog-title">
            Close Survey
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="close-survey-dialog-description">
              Are you sure you want to close the survey "{surveyToClose?.title}"? 
              This will prevent any new responses from being submitted. This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={closingLoading}>
              Cancel
            </Button>
            <Button 
              onClick={confirmCloseSurvey} 
              color="warning" 
              variant="contained"
              disabled={closingLoading}
            >
              {closingLoading ? 'Closing...' : 'Close Survey'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default MySurveys; 