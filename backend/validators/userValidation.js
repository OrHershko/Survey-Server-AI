const Joi = require('joi');

const registrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required()
    .messages({
      'string.base': 'Username should be a type of text',
      'string.empty': 'Username cannot be an empty field',
      'string.alphanum': 'Username should only contain alpha-numeric characters',
      'string.min': 'Username should have a minimum length of {#limit}',
      'string.max': 'Username should have a maximum length of {#limit}',
      'any.required': 'Username is a required field'
    }),
  email: Joi.string().email({
    minDomainSegments: 2,
    tlds: { allow: ['com', 'net', 'org', 'edu', 'gov'] } // Customize as needed
  }).required()
    .messages({
      'string.base': 'Email should be a type of text',
      'string.empty': 'Email cannot be an empty field',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is a required field'
    }),
  password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9!@#$%^&*()_+\\-=\\[\\]{};\':"\\|,.<>\\/?]+$')).required()
    .messages({
      'string.base': 'Password should be a type of text',
      'string.empty': 'Password cannot be an empty field',
      'string.pattern.base': 'Password can only contain letters, numbers, and special characters (no spaces)',
      'any.required': 'Password is a required field'
    }),
  registrationCode: Joi.string().required() // Assuming REGISTRATION_SECRET implies a code is needed
    .messages({
      'string.base': 'Registration code should be a type of text',
      'string.empty': 'Registration code cannot be an empty field',
      'any.required': 'Registration code is a required field'
    })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'string.base': 'Email should be a type of text',
      'string.empty': 'Email cannot be an empty field',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is a required field'
    }),
  password: Joi.string().required()
    .messages({
      'string.base': 'Password should be a type of text',
      'string.empty': 'Password cannot be an empty field',
      'any.required': 'Password is a required field'
    })
});

module.exports = {
  registrationSchema,
  loginSchema,
}; 