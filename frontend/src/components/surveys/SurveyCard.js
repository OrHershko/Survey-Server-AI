import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Visibility } from '@mui/icons-material';
import CountdownTimer from '../common/CountdownTimer';
import { useNavigate } from 'react-router-dom';

const SurveyCard = ({ 
  survey, 
  showControlButton = false, 
  isCreator = false, 
  showAddResponse = false,
  currentUserId = null
}) => {
  const navigate = useNavigate();
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h5" component="h2">
          {survey.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {survey.question}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" display="block" color="text.secondary">
            Area: {survey.area}
          </Typography>
          <CountdownTimer expiryDate={survey.expiryDate} closed={survey.closed} />
          
          {/* Show public summary indicator for non-creators */}
          {survey.summary && survey.summary.text && survey.summary.isVisible && 
           currentUserId && survey.creator && survey.creator._id !== currentUserId && (
            <Box sx={{ mt: 1 }}>
              <Chip
                icon={<Visibility />}
                label="Public Summary Available"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
                onClick={() => {
                  navigate(`/surveys/${survey._id}`);
                }}
              />
            </Box>
          )}
        </Box>
        {survey.aiReason && (
          <Alert severity="info" sx={{ mt: 2, fontSize: '0.875rem' }}>
            <Typography variant="caption" component="div">
              <strong>🤖 AI Match:</strong> {survey.aiReason}
            </Typography>
          </Alert>
        )}
      </CardContent>
      <CardActions>
        {showControlButton && isCreator ? (
          <Button
            component={RouterLink}
            to={`/control-survey/${survey._id}`}
            size="small"
          >
            View Details
          </Button>
        ) : showAddResponse ? (
          <Button
            component={RouterLink}
            to={`/surveys/${survey._id}`}
            size="small"
          >
            Add Response
          </Button>
        ) : null}
      </CardActions>
    </Card>
  );
};

export default SurveyCard; 