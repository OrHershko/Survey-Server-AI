import React, { useState } from 'react';
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemText,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import { aiService } from '../../services';
import LoadingButton from '../form/LoadingButton';
import ToastNotification from '../common/ToastNotification';
import { Link as RouterLink } from 'react-router-dom';

const SearchSurveys = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await aiService.searchSurveysNLP({ query });
      setResults(response);
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Search Surveys with AI
      </Typography>
      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Enter your search query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <LoadingButton
          type="submit"
          variant="contained"
          isLoading={loading}
          sx={{ px: 4 }}
        >
          Search
        </LoadingButton>
      </Box>

      <ToastNotification
        open={!!error}
        message={error}
        severity="error"
        onClose={() => setError(null)}
      />

      {searched && !loading && results.length > 0 && (
        <Paper>
          <List>
            {results.map((result, index) => (
              <React.Fragment key={result.survey._id}>
                <ListItem
                  alignItems="flex-start"
                  component={RouterLink}
                  to={`/surveys/${result.survey._id}`}
                  sx={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <ListItemText
                    primary={result.survey.title}
                    secondary={
                      <>
                        <Typography
                          sx={{ display: 'block' }}
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          Reasoning: {result.reason}
                        </Typography>
                        {result.survey.question}
                      </>
                    }
                  />
                </ListItem>
                {index < results.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {searched && !loading && results.length === 0 && (
        <Typography>No surveys found matching your query.</Typography>
      )}
    </Box>
  );
};

export default SearchSurveys; 