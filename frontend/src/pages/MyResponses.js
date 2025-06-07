import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
} from '@mui/material';
import api from '../services/api';
import { Link as RouterLink } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ToastNotification from '../components/common/ToastNotification';
import { useAuth } from '../hooks/useAuth';

const MyResponses = () => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMyResponses = async () => {
      if (!user) return;
      try {
        // Using the configured API service to get all responses by a user
        const response = await api.get(`/api/responses/user/${user._id}`);
        setResponses(response.data);
      } catch (err) {
        setError('Failed to fetch your responses.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyResponses();
  }, [user]);

  if (loading) {
    return <LoadingSpinner message="Fetching your responses..." />;
  }

  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Submitted Responses
        </Typography>
        <ToastNotification
          open={!!error}
          message={error}
          severity="error"
          onClose={() => setError(null)}
        />
        {responses.length > 0 ? (
          <Paper>
            <List>
              {responses.map((response, index) => (
                <React.Fragment key={response._id}>
                  <ListItem
                    alignItems="flex-start"
                    component={RouterLink}
                    to={`/surveys/${response.survey._id}`}
                    sx={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="h6">
                          {response.survey.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography
                            sx={{ display: 'block' }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            Your response: {response.text}
                          </Typography>
                          {`Submitted on: ${new Date(
                            response.createdAt
                          ).toLocaleDateString()}`}
                        </>
                      }
                    />
                  </ListItem>
                  {index < responses.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        ) : (
          <Typography>You have not submitted any responses yet.</Typography>
        )}
      </Box>
    </Container>
  );
};

export default MyResponses; 