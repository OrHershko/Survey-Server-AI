import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../hooks/useAuth';

const ResponseList = ({ responses, onEdit, onDelete }) => {
  const { user } = useAuth();

  if (!responses || responses.length === 0) {
    return (
      <Typography sx={{ mt: 4 }}>
        No responses submitted yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Submitted Responses
      </Typography>
      <List>
        {responses.map((response) => (
          <ListItem
            key={response._id}
            divider
            secondaryAction={
              user && user._id === response.user && (
                <>
                  <IconButton edge="end" aria-label="edit" onClick={() => onEdit(response)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => onDelete(response._id)}>
                    <DeleteIcon />
                  </IconButton>
                </>
              )
            }
          >
            <ListItemText
              primary={response.text}
              secondary={`By: ${response.user.username || 'Anonymous'} on ${new Date(
                response.createdAt
              ).toLocaleDateString()}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ResponseList; 