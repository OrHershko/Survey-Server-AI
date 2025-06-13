import React from 'react';
import { TextField } from '@mui/material';

const ValidatedTextField = ({ name, label, value, onChange, error, helperText, ...rest }) => {
  return (
    <TextField
      variant="outlined"
      margin="normal"
      fullWidth
      id={name}
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      error={!!error}
      helperText={helperText}
      {...rest}
    />
  );
};

export default ValidatedTextField; 