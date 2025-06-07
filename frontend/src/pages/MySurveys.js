import React, { useState, useEffect } from 'react';
import { Container, Grid, Typography, Box } from '@mui/material';
import { surveyService } from '../services';
import SurveyCard from '../components/surveys/SurveyCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ToastNotification from '../components/common/ToastNotification';
import { useAuth } from '../hooks/useAuth';

const MySurveys = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMySurveys = async () => {
      if (!user) return;
      try {
        // Get surveys created by the current user
        const response = await surveyService.getSurveys({ creator: user._id });
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

  if (loading) {
    return <LoadingSpinner message="Fetching your surveys..." />;
  }

  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Surveys
        </Typography>
        {error && (
          <ToastNotification
            open={!!error}
            message={error}
            severity="error"
            onClose={() => setError(null)}
          />
        )}
        <Grid container spacing={4}>
          {surveys.length > 0 ? (
            surveys.map((survey) => (
              <Grid item key={survey._id} xs={12} sm={6} md={4}>
                <SurveyCard survey={survey} />
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Typography>You have not created any surveys yet.</Typography>
            </Grid>
          )}
        </Grid>
      </Box>
    </Container>
  );
};

export default MySurveys; 