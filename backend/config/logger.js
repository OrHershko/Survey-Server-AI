const winston = require('winston');
const path = require('path');

// Determine log level from environment variable or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// Define different logging formats
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json() // Log in JSON format to files
);

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // Log stack traces for errors
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'survey-server-api' },
  transports: [
    // Console transport - for development and general output
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for errors - only log error level messages to this file
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // Do not exit on handled exceptions
  exitOnError: false,
});

// If not in production, also log to the console with a simpler format
if (process.env.NODE_ENV !== 'production') {
  // logger.add(new winston.transports.Console({
  //   format: winston.format.simple(),
  // }));
} else {
  // In production, ensure console logs are also structured if needed or remove for performance
  // For now, the default console transport above will use consoleFormat
}

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: function(message, encoding){
    // Use the 'info' log level so the output will be picked up by both transports
    logger.info(message.trim());
  },
};

module.exports = logger; 