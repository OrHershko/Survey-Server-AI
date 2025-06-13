import React from 'react';
import { Button, CircularProgress } from '@mui/material';

const LoadingButton = ({ isLoading, children, ...rest }) => {
  return (
    <Button {...rest} disabled={isLoading || rest.disabled}>
      {isLoading ? <CircularProgress size={24} color="inherit" /> : children}
    </Button>
  );
};

export default LoadingButton; 