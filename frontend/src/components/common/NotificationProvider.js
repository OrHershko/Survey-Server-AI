import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, AlertTitle, Slide, Box } from '@mui/material';
import { addNotificationListener, getNotifications, dismissNotification } from '../../utils/notifications';

const SlideTransition = (props) => {
  return <Slide {...props} direction="left" />;
};

const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(getNotifications());

  useEffect(() => {
    // Subscribe to notification changes
    const unsubscribe = addNotificationListener(setNotifications);
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const handleClose = (notificationId) => {
    dismissNotification(notificationId);
  };

  return (
    <>
      {children}
      
      {/* Render notifications */}
      <Box
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: 400,
        }}
      >
        {notifications.map((notification) => (
          <Snackbar
            key={notification.id}
            open={true}
            autoHideDuration={notification.duration || null}
            onClose={() => handleClose(notification.id)}
            TransitionComponent={SlideTransition}
            sx={{
              position: 'relative',
              transform: 'none !important',
              top: 'auto !important',
              right: 'auto !important',
              bottom: 'auto !important',
              left: 'auto !important',
            }}
          >
            <Alert
              severity={notification.type}
              onClose={notification.dismissible ? () => handleClose(notification.id) : undefined}
              variant="filled"
              sx={{
                width: '100%',
                '& .MuiAlert-message': {
                  width: '100%',
                },
              }}
            >
              {notification.title && (
                <AlertTitle>{notification.title}</AlertTitle>
              )}
              {notification.message}
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </>
  );
};

export default NotificationProvider; 