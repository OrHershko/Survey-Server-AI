import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  QueryBuilder as QueryBuilderIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth, useSurveys, useAI } from '../hooks';
import { apiNotifications } from '../utils/notifications';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    surveys,
    loading: surveysLoading,
    error: surveysError,
    fetchSurveys,
    closeSurvey,
    clearError: clearSurveysError
  } = useSurveys();
  
  const {
    loading: aiLoading,
    generateSummary,
    validateResponses
  } = useAI();

  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalSurveys: 0,
    activeSurveys: 0,
    totalResponses: 0,
    summariesGenerated: 0
  });

  // Fetch user's surveys on mount
  useEffect(() => {
    if (user?.id) {

      fetchSurveys({ creator: user.id }).catch(err => {
        console.error('Failed to fetch user surveys:', err);
      });
    }
  }, [user, fetchSurveys]);

  // Calculate stats from surveys (Dashboard only shows user's own surveys)
  useEffect(() => {
    const totalSurveys = surveys.length;
    const activeSurveys = surveys.filter(s => !s.closed && new Date(s.expiryDate) > new Date()).length;
    const totalResponses = surveys.reduce((acc, s) => acc + (s.responseCount || s.responses?.length || 0), 0);
    
    // Count all summaries since Dashboard only shows user's own surveys
    const summariesGenerated = surveys.filter(s => s.summary && s.summary.text).length;

    setStats({
      totalSurveys,
      activeSurveys,
      totalResponses,
      summariesGenerated
    });
  }, [surveys]);

  const handleCloseSurvey = async (surveyId) => {
    try {
      await closeSurvey(surveyId);
      apiNotifications.survey.closed();
    } catch (error) {
      apiNotifications.survey.updateError(error.message);
    }
  };

  const handleGenerateSummary = async (surveyId) => {
    try {
      apiNotifications.ai.summaryGenerating();
      await generateSummary(surveyId);
      apiNotifications.ai.summaryGenerated();
    } catch (error) {
      apiNotifications.ai.summaryError(error.message);
    }
  };

  const handleValidateResponses = async (surveyId) => {
    try {
      const response = await validateResponses(surveyId);
      const issueCount = response.validation?.issues?.length || 0;
      apiNotifications.ai.validationCompleted(issueCount);
    } catch (error) {
      apiNotifications.ai.validationError(error.message);
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="h2" color={color}>
              {value}
            </Typography>
          </Box>
          <Box color={`${color}.main`}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const SurveyCard = ({ survey }) => {
    const isActive = !survey.closed && new Date(survey.expiryDate) > new Date();
    const responseCount = survey.responses?.length || 0;
    const hasValidationIssues = survey.validationResults?.issues?.length > 0;

    return (
      <Card elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Typography variant="h6" component="h3" gutterBottom onClick={() => { navigate(`/control-survey/${survey._id}`)}} sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
              {survey.title}
            </Typography>
            <Chip 
              label={isActive ? 'Active' : 'Closed'} 
              color={isActive ? 'success' : 'default'}
              size="small"
              clickable={false}
              onClick={() => {}}
            />
          </Box>
          
          <Typography color="textSecondary" gutterBottom>
            {survey.area}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" paragraph>
            {survey.question.length > 100 
              ? `${survey.question.substring(0, 100)}...` 
              : survey.question
            }
          </Typography>
          
          <Box display="flex" gap={2} mb={2}>
            <Chip 
              icon={<PeopleIcon />} 
              label={`${responseCount} responses`} 
              size="small" 
              variant="outlined"
              clickable={false}
              onClick={() => {}}
            />
            <Chip 
              icon={<QueryBuilderIcon />} 
              label={new Date(survey.expiryDate).toLocaleDateString()} 
              size="small" 
              variant="outlined"
              clickable={false}
              onClick={() => {}}
            />
            {survey.summary && (
              <Chip 
                icon={<CheckCircleIcon />} 
                label="Summary" 
                size="small" 
                color="success" 
                variant="outlined"
                clickable={false}
                onClick={() => {}}
              />
            )}
            {hasValidationIssues && (
              <Chip 
                label="Issues" 
                size="small" 
                color="warning" 
                variant="outlined"
                clickable={false}
                onClick={() => {}}
              />
            )}
          </Box>
          
          <Typography variant="caption" color="textSecondary">
            Expires: {new Date(survey.expiryDate).toLocaleDateString()}
          </Typography>
        </CardContent>
        
        <CardActions>
          <Button 
            size="small" 
            onClick={() => navigate(`/control-survey/${survey._id}`)}
          >
            View Details
          </Button>
        </CardActions>
      </Card>
    );
  };

  const QuickActions = () => (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Quick Actions
      </Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/create-survey')}
          fullWidth
        >
          Create New Survey
        </Button>
        
        <Button
          variant="outlined"
          onClick={() => navigate('/surveys')}
          fullWidth
        >
          Browse All Surveys
        </Button>
        
        <Button
          variant="outlined"
          onClick={() => navigate('/my-responses')}
          fullWidth
        >
          My Responses
        </Button>
      </Box>
    </Paper>
  );

  const RecentActivity = () => {
    const recentSurveys = surveys
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        
        {recentSurveys.length > 0 ? (
          <List dense>
            {recentSurveys.map((survey, index) => (
              <React.Fragment key={survey._id}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary={survey.title}
                    secondary={`Created ${new Date(survey.createdAt).toLocaleDateString()} • ${survey.responses?.length || 0} responses`}
                  />
                </ListItem>
                {index < recentSurveys.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography color="textSecondary">
            No recent activity. Create your first survey to get started!
          </Typography>
        )}
      </Paper>
    );
  };

  if (surveysLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user?.username}! 👋
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's an overview of your survey activity and quick actions to get you started.
        </Typography>
      </Box>

      {/* Error handling */}
      {surveysError && (
        <Alert 
          severity="error" 
          onClose={clearSurveysError}
          sx={{ mb: 3 }}
        >
          {surveysError}
        </Alert>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Surveys"
            value={stats.totalSurveys}
            icon={<TrendingUpIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Surveys"
            value={stats.activeSurveys}
            icon={<ScheduleIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Responses"
            value={stats.totalResponses}
            icon={<PeopleIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="AI Summaries"
            value={stats.summariesGenerated}
            icon={<PsychologyIcon />}
            color="secondary"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                <Tab label="My Surveys" />
                <Tab label="Recent Activity" />
              </Tabs>
            </Box>

            {activeTab === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Your Surveys ({surveys.length})
                </Typography>
                
                {surveys.length > 0 ? (
                  <Grid container spacing={2}>
                    {surveys.map(survey => (
                      <Grid item xs={12} sm={6} key={survey._id}>
                        <SurveyCard survey={survey} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box textAlign="center" py={4}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      No surveys yet
                    </Typography>
                    <Typography color="textSecondary" paragraph>
                      Create your first survey to start collecting responses and insights.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/create-survey')}
                    >
                      Create Your First Survey
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {activeTab === 1 && <RecentActivity />}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <QuickActions />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 