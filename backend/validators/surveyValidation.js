const Joi = require('joi');

const surveyCreationSchema = Joi.object({
  title: Joi.string().min(3).max(100).required()
    .messages({
      'string.base': 'Title should be a type of text',
      'string.empty': 'Title cannot be an empty field',
      'string.min': 'Title should have a minimum length of {#limit}',
      'string.max': 'Title should have a maximum length of {#limit}',
      'any.required': 'Title is a required field'
    }),
  area: Joi.string().min(3).max(50).required()
    .messages({
      'string.base': 'Area should be a type of text',
      'string.empty': 'Area cannot be an empty field',
      'string.min': 'Area should have a minimum length of {#limit}',
      'string.max': 'Area should have a maximum length of {#limit}',
      'any.required': 'Area is a required field'
    }),
  question: Joi.string().min(10).max(500).required()
    .messages({
      'string.base': 'Question should be a type of text',
      'string.empty': 'Question cannot be an empty field',
      'string.min': 'Question should have a minimum length of {#limit}',
      'string.max': 'Question should have a maximum length of {#limit}',
      'any.required': 'Question is a required field'
    }),
  guidelines: Joi.string().max(2000).allow(''), // Optional, max length
  permittedDomains: Joi.array().items(Joi.string().pattern(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/))
    .optional()
    .messages({
        'string.pattern.base': 'Each permitted domain must be a valid domain name (e.g., example.com)'
    }),
  permittedResponses: Joi.number().integer().min(1).optional(), // Optional, positive integer
  summaryInstructions: Joi.string().max(2000).allow(''), // Optional, max length
  expiryDate: Joi.date().iso().greater('now').optional() // Optional, ISO date format, must be in the future
    .messages({
        'date.greater': 'Expiry date must be in the future',
        'date.format': 'Expiry date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)'
    })
});

const surveyResponseSchema = Joi.object({
  text: Joi.string().min(1).max(5000).required()
    .messages({
      'string.base': 'Response text should be a type of text',
      'string.empty': 'Response text cannot be an empty field',
      'string.min': 'Response text should have a minimum length of {#limit}',
      'string.max': 'Response text should have a maximum length of {#limit}',
      'any.required': 'Response text is a required field'
    })
});

const surveyUpdateExpirySchema = Joi.object({
    expiryDate: Joi.date().iso().greater('now').required()
        .messages({
            'date.greater': 'Expiry date must be in the future',
            'date.format': 'Expiry date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
            'any.required': 'Expiry date is a required field'
        })
});

module.exports = {
  surveyCreationSchema,
  surveyResponseSchema,
  surveyUpdateExpirySchema
}; 