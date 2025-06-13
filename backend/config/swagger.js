const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Survey Server API with AI Features',
      version: '1.0.0',
      description: 'A comprehensive survey management platform with AI-powered summarization, validation, and natural language search capabilities',
      contact: {
        name: 'API Support',
        email: 'support@surveyserver.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.surveyserver.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier',
              example: '507f1f77bcf86cd799439011'
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              description: 'Unique username',
              example: 'john_doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password (returned only during registration)',
              example: 'securePassword123'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            }
          }
        },
        Survey: {
          type: 'object',
          required: ['title', 'description', 'questions'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique survey identifier',
              example: '507f1f77bcf86cd799439012'
            },
            title: {
              type: 'string',
              maxLength: 200,
              description: 'Survey title',
              example: 'Customer Satisfaction Survey'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Survey description',
              example: 'Help us improve our services by sharing your feedback'
            },
            questions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Question'
              },
              description: 'List of survey questions'
            },
            area: {
              type: 'string',
              enum: ['Technology', 'Healthcare', 'Education', 'Business', 'Entertainment', 'Sports', 'Other'],
              description: 'Survey category',
              example: 'Technology'
            },
            creator: {
              type: 'string',
              description: 'ID of the user who created the survey',
              example: '507f1f77bcf86cd799439011'
            },
            status: {
              type: 'string',
              enum: ['active', 'closed'],
              description: 'Survey status',
              example: 'active'
            },
            expiryDate: {
              type: 'string',
              format: 'date-time',
              description: 'Survey expiration date'
            },
            maxResponses: {
              type: 'integer',
              minimum: 1,
              description: 'Maximum number of responses allowed',
              example: 1000
            },
            responseCount: {
              type: 'integer',
              description: 'Current number of responses',
              example: 45
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Survey creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Survey last update timestamp'
            }
          }
        },
        Question: {
          type: 'object',
          required: ['text', 'type'],
          properties: {
            text: {
              type: 'string',
              description: 'Question text',
              example: 'How satisfied are you with our service?'
            },
            type: {
              type: 'string',
              enum: ['multiple_choice', 'text', 'rating', 'yes_no'],
              description: 'Question type',
              example: 'rating'
            },
            options: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Available options (for multiple choice questions)',
              example: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied']
            },
            required: {
              type: 'boolean',
              description: 'Whether the question is required',
              example: true
            }
          }
        },
        SurveyResponse: {
          type: 'object',
          required: ['userId', 'surveyId', 'answers'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique response identifier',
              example: '507f1f77bcf86cd799439013'
            },
            userId: {
              type: 'string',
              description: 'ID of the user who submitted the response',
              example: '507f1f77bcf86cd799439011'
            },
            surveyId: {
              type: 'string',
              description: 'ID of the survey being responded to',
              example: '507f1f77bcf86cd799439012'
            },
            answers: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Answer'
              },
              description: 'List of answers to survey questions'
            },
            submittedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Response submission timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Response last update timestamp'
            }
          }
        },
        Answer: {
          type: 'object',
          required: ['questionIndex', 'answer'],
          properties: {
            questionIndex: {
              type: 'integer',
              description: 'Index of the question being answered',
              example: 0
            },
            answer: {
              type: 'string',
              description: 'User answer to the question',
              example: 'Very Satisfied'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'User registered successfully'
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' }
              }
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token'
            }
          }
        },
        SurveySummary: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Summary identifier'
            },
            surveyId: {
              type: 'string',
              description: 'Associated survey ID'
            },
            summary: {
              type: 'string',
              description: 'AI-generated summary of survey responses'
            },
            insights: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Key insights extracted from responses'
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether summary is publicly visible'
            },
            generatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Summary generation timestamp'
            }
          }
        },
        ValidationResult: {
          type: 'object',
          properties: {
            isValid: {
              type: 'boolean',
              description: 'Overall validation status'
            },
            invalidResponses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  responseId: { type: 'string' },
                  issues: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  suggestions: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            },
            feedback: {
              type: 'string',
              description: 'General validation feedback'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Validation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Detailed error messages'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Surveys',
        description: 'Survey management operations'
      },
      {
        name: 'Responses',
        description: 'Survey response operations'
      },
      {
        name: 'AI Features',
        description: 'AI-powered survey analysis and search'
      }
    ]
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customSiteTitle: 'Survey Server API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  })
}; 