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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link as RouterLink } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ToastNotification from '../components/common/ToastNotification';
import { useAuth } from '../hooks/useAuth';
import { surveyService } from '../services';

const MyResponses = () => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState(null);
  const [editText, setEditText] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const fetchMyResponses = async () => {
      // Wait for authentication to complete
      if (authLoading) return;
      
      // If no user is authenticated, stop loading
      if (!user || !user.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Ensure user ID is a string
        const userId = typeof user.id === 'string' ? user.id : user.id.toString();
        const userResponses = await surveyService.getAllUserResponses(userId);
        setResponses(userResponses);
      } catch (err) {
        setError(err.message || 'Failed to fetch your responses.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyResponses();
  }, [user, authLoading]);

  const handleEdit = (response) => {
    setEditingResponse(response);
    setEditText(response.text);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingResponse || !editText.trim()) return;

    try {
      setEditLoading(true);
      await surveyService.updateResponse(
        editingResponse.survey._id,
        editingResponse._id,
        { text: editText }
      );

      // Update the response in the local state
      setResponses(prev => prev.map(response => 
        response._id === editingResponse._id 
          ? { ...response, text: editText, updatedAt: new Date().toISOString() }
          : response
      ));

      setEditDialogOpen(false);
      setEditingResponse(null);
      setEditText('');
    } catch (err) {
      setError(err.message || 'Failed to update response.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (response) => {
    if (!window.confirm('Are you sure you want to delete this response?')) return;

    try {
      setDeleteLoading(response._id);
      await surveyService.deleteResponse(response.survey._id, response._id);

      // Remove the response from local state
      setResponses(prev => prev.filter(r => r._id !== response._id));
    } catch (err) {
      setError(err.message || 'Failed to delete response.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setEditingResponse(null);
    setEditText('');
  };

  // Show loading while auth is loading
  if (authLoading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  // Show message if not authenticated
  if (!user) {
    return (
      <Container>
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            My Submitted Responses
          </Typography>
          <Typography>Please log in to view your responses.</Typography>
        </Box>
      </Container>
    );
  }

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
                    sx={{ pl: 2, pr: 2 }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          edge="end" 
                          aria-label="edit" 
                          onClick={() => handleEdit(response)}
                          disabled={editLoading}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={() => handleDelete(response)}
                          disabled={deleteLoading === response._id}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      sx={{ pr: 10 }}
                      primary={
                        <Box>
                          <Typography 
                            variant="h6" 
                            component={RouterLink}
                            to={`/surveys/${response.survey._id}`}
                            sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {response.survey.title}
                          </Typography>
                          <Chip 
                            label={response.survey.area} 
                            size="small" 
                            sx={{ ml: 1 }} 
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            sx={{ display: 'block', mb: 1 }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            <strong>Question:</strong> {response.survey.question}
                          </Typography>
                          <Typography
                            sx={{ display: 'block', mb: 1 }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            <strong>Your response:</strong> {response.text}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Submitted on: {new Date(response.createdAt).toLocaleDateString()}
                            {response.updatedAt !== response.createdAt && (
                              <span> • Updated on: {new Date(response.updatedAt).toLocaleDateString()}</span>
                            )}
                          </Typography>
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

        {/* Edit Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={handleEditCancel}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Edit Response</DialogTitle>
          <DialogContent>
            {editingResponse && (
              <>
                <Typography variant="h6" gutterBottom>
                  {editingResponse.survey.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {editingResponse.survey.question}
                </Typography>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Your Response"
                  fullWidth
                  multiline
                  rows={4}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  variant="outlined"
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditCancel} disabled={editLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSave} 
              variant="contained" 
              disabled={editLoading || !editText.trim()}
            >
              {editLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default MyResponses; 