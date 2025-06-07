import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Grid, 
  Typography, 
  Box, 
  Button, 
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Chip
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSurveys, useAI } from '../hooks';
import SurveyCard from '../components/surveys/SurveyCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ToastNotification from '../components/common/ToastNotification';
const Surveys = () => {
  const navigate = useNavigate();
  const {
    surveys,
    loading,
    error,
    pagination,
    fetchSurveys,
    clearError
  } = useSurveys();
  
  const {
    searchResults,
    loading: searchLoading,
    searchSurveys,
    clearSearchResults
  } = useAI();

  // Local state for filters and search
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    page: 1
  });
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch surveys on component mount and when filters change
  useEffect(() => {
    if (!isSearchMode) {
      const params = {
        page: filters.page,
        limit: 12,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      };
      
      fetchSurveys(params).catch(err => {
        console.error('Failed to fetch surveys:', err);
      });
    }
  }, [filters, isSearchMode, fetchSurveys]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (event, page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Handle AI search
  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearchMode(true);
      await searchSurveys(searchQuery, 20);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  // Clear search and return to normal mode
  const handleClearSearch = () => {
    setIsSearchMode(false);
    setSearchQuery('');
    clearSearchResults();
  };

  if (loading && !isSearchMode) {
    return <LoadingSpinner message="Fetching surveys..." />;
  }

  const displaySurveys = isSearchMode ? 
    searchResults.map(result => result.survey || result) : 
    surveys;

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1">
            Survey Hub
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-survey')}
            size="large"
          >
            Create Survey
          </Button>
        </Box>

        {/* AI Search */}
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            🤖 AI-Powered Search
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              fullWidth
              placeholder="Ask anything... e.g., 'Find surveys about technology'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
              disabled={searchLoading}
            />
            <Button
              variant="contained"
              onClick={handleAISearch}
              disabled={!searchQuery.trim() || searchLoading}
              startIcon={<SearchIcon />}
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </Button>
            {isSearchMode && (
              <Button onClick={handleClearSearch}>
                Clear
              </Button>
            )}
          </Box>
          {isSearchMode && (
            <Chip 
              label={`AI Search: "${searchQuery}"`} 
              onDelete={handleClearSearch}
              sx={{ mt: 2 }}
            />
          )}
        </Paper>

        {/* Filters (only show in normal mode) */}
        {!isSearchMode && (
          <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Surveys</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  placeholder="Search by title or area..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Error handling */}
        {error && (
          <ToastNotification
            open={!!error}
            message={error}
            severity="error"
            onClose={clearError}
          />
        )}

        {/* Survey Grid */}
        <Grid container spacing={4}>
          {displaySurveys.length > 0 ? (
            displaySurveys.map((survey) => (
              <Grid item key={survey._id} xs={12} sm={6} md={4}>
                <SurveyCard survey={survey} />
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {isSearchMode ? 'No surveys found for your search' : 'No surveys available'}
                </Typography>
                <Typography color="text.secondary">
                  {isSearchMode 
                    ? 'Try a different search query or browse all surveys'
                    : 'Be the first to create a survey!'
                  }
                </Typography>
                {!isSearchMode && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/create-survey')}
                    sx={{ mt: 2 }}
                  >
                    Create First Survey
                  </Button>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* Pagination (only in normal mode) */}
        {!isSearchMode && pagination.totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              size="large"
            />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Surveys; 