require('dotenv').config(); // Load environment variables at the very top
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const logger = require('./config/logger'); // Import Winston logger
const mongoose = require('mongoose');
const { loadPrompts } = require('./services/llmService'); // Import loadPrompts
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// Load LLM Prompts
loadPrompts().catch(error => {
    logger.error('Failed to initialize LLM prompts during server startup:', error);
    // Depending on the criticality, you might want to exit the process
    // process.exit(1);
});

// Middleware
// CORS configuration
app.use(cors()); // Allows all origins by default. Configure for specific origins in production.

// HTTP request logger (Morgan)
// Use Winston stream for Morgan logs
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', { stream: logger.stream }));
} else {
  // For production, you might want a more concise format like 'combined' or a custom JSON format
  app.use(morgan('combined', { stream: logger.stream }));
}

// Body parsing for JSON requests
app.use(express.json());
// Body parsing for URL-encoded requests
app.use(express.urlencoded({ extended: true }));

// Basic Route (can be removed or replaced later)
app.get('/', (req, res) => {
  res.send('Survey Server API is running...');
});

// API routes
const authRoutes = require('./routes/authRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const aiRoutes = require('./routes/aiRoutes'); // Import AI routes
app.use('/auth', authRoutes);
app.use('/surveys', surveyRoutes);
app.use('/api/ai', aiRoutes); // Use AI routes

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Unhandled Rejection: ${err.message}`, { error: err });
    // Close server & exit process
    // server.close(() => process.exit(1)); // Consider if this is too abrupt
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        mongoose.connection.close(false, () => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        });
    });
});

module.exports = app; // For testing purposes 