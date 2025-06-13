import React from 'react';
import { Box, Typography, Button, Alert, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            textAlign: 'center',
            p: 3,
          }}
        >
          <Typography variant="h4" gutterBottom>
            Something went wrong.
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            We're sorry for the inconvenience. Please try refreshing the page.
          </Typography>
          
          {isDevelopment && (
            <Box sx={{ width: '100%', maxWidth: 800, mb: 3 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="h6">Error Details (Development Mode)</Typography>
                <Typography variant="body2">
                  {this.state.error?.message || 'Unknown error'}
                </Typography>
              </Alert>
              
              {(this.state.error?.stack || this.state.errorInfo) && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Stack Trace</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography 
                      component="pre" 
                      sx={{ 
                        fontSize: '0.75rem', 
                        whiteSpace: 'pre-wrap', 
                        textAlign: 'left',
                        backgroundColor: '#f5f5f5',
                        p: 2,
                        borderRadius: 1,
                        overflow: 'auto'
                      }}
                    >
                      {this.state.error?.stack}
                      {this.state.errorInfo?.componentStack}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
          
          <Button variant="contained" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 