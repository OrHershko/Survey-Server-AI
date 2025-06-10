import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';

const EditResponseModal = ({ open, response, onClose, onSave }) => {
  const [editedText, setEditedText] = useState('');

  useEffect(() => {
    if (response) {
      setEditedText(response.text);
    }
  }, [response]);

  const handleSave = () => {
    if (response) {
      onSave({ ...response, text: editedText });
    }
  };

  if (!response) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Response</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            label="Response Text"
            multiline
            rows={4}
            fullWidth
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            variant="outlined"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditResponseModal; 