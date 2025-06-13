import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
  Avatar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../../hooks/useAuth';

const ResponseList = ({ 
  responses, 
  onEdit, 
  onDelete, 
  allowOwnerDelete = false,
  isOwnerView = false,
  surveyCreatorId,
  isSurveyClosed = false
}) => {
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (!responses || responses.length === 0) {
    return (
      <Typography sx={{ mt: 4 }}>
        No responses submitted yet.
      </Typography>
    );
  }

  const handleDeleteClick = (response) => {
    setResponseToDelete(response);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (responseToDelete && onDelete) {
      setDeleting(true);
      try {
        await onDelete(responseToDelete._id);
        setDeleteDialogOpen(false);
        setResponseToDelete(null);
      } catch (error) {
        console.error('Delete error:', error);
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setResponseToDelete(null);
  };

  const canEditResponse = (response) => {
    if (!user || !response) return false;
    
    // Handle both cases: response.user as object or as string ID
    const responseUserId = typeof response.user === 'object' 
      ? response.user?._id || response.user?.id
      : response.user;
    
    // Only allow editing if:
    // 1. User owns the response AND
    // 2. Survey is not closed (unless user is the survey creator)
    const isOwner = user.id === responseUserId;
    const isSurveyCreator = surveyCreatorId && user.id === surveyCreatorId;
    
    return isOwner && (!isSurveyClosed || isSurveyCreator);
  };

  const canDeleteResponse = (response) => {
    if (!user || !response) return false;
    
    // Handle both cases: response.user as object or as string ID
    const responseUserId = typeof response.user === 'object' 
      ? response.user?._id || response.user?.id
      : response.user;
    
    const isOwner = user.id === responseUserId;
    const isSurveyCreator = surveyCreatorId && user.id === surveyCreatorId;
    
    // Survey creators can always delete any response
    if (isSurveyCreator) {
      return true;
    }
    
    // Regular users can only delete their own responses when survey is not closed
    return isOwner && !isSurveyClosed;
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Submitted Responses ({responses.length})
      </Typography>
      <List>
        {responses.map((response) => {
          const showEditButton = canEditResponse(response);
          const showDeleteButton = canDeleteResponse(response);
          
          // Safely get response user ID
          const responseUserId = typeof response.user === 'object' 
            ? response.user?._id || response.user?.id
            : response.user;
          const isOwnResponse = user && user.id === responseUserId;

          return (
            <ListItem
              key={response._id}
              divider
              alignItems="flex-start"
              secondaryAction={
                (showEditButton || showDeleteButton) && (
                  <Box>
                    {showEditButton && (
                      <IconButton 
                        edge="end" 
                        aria-label="edit" 
                        onClick={() => onEdit(response)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {showDeleteButton && (
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={() => handleDeleteClick(response)}
                        size="small"
                        color={isOwnResponse ? "default" : "error"}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                )
              }
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', pr: 8 }}>
                <Avatar sx={{ mr: 2, mt: 0.5, bgcolor: 'primary.light' }}>
                  <PersonIcon />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                          {response.text}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Chip 
                          label={
                            typeof response.user === 'object' 
                              ? response.user?.username || 'Anonymous'
                              : 'User'
                          } 
                          size="small" 
                          variant="outlined"
                          icon={<PersonIcon />}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(response.createdAt).toLocaleDateString()} at{' '}
                          {new Date(response.createdAt).toLocaleTimeString()}
                        </Typography>
                        {isOwnerView && !isOwnResponse && (
                          <Chip 
                            label="Can Delete" 
                            size="small" 
                            color="warning" 
                            variant="outlined"
                          />
                        )}
                        {response.updatedAt !== response.createdAt && (
                          <Chip 
                            label="Edited" 
                            size="small" 
                            color="info" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                  />
                </Box>
              </Box>
            </ListItem>
          );
        })}
      </List>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Response</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this response? This action cannot be undone.
          </DialogContentText>
          {responseToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                "{responseToDelete.text}"
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                By: {
                  typeof responseToDelete.user === 'object' 
                    ? responseToDelete.user?.username || 'Anonymous'
                    : 'User'
                }
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResponseList; 