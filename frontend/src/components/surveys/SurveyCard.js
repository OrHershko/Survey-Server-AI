import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  Box,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import CountdownTimer from '../common/CountdownTimer';

const SurveyCard = ({ 
  survey, 
  showControlButton = false, 
  isCreator = false, 
  showAddResponse = false 
}) => {
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
        </Box>
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