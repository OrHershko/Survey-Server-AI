const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const surveySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    guidelines: {
      type: String,
      trim: true,
    },
    permittedDomains: [String],
    permittedResponses: Number, // Max number of responses per user
    summaryInstructions: {
      type: String,
      trim: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    closed: {
      type: Boolean,
      default: false,
    },
    responses: [responseSchema],
    summary: {
      text: String,
      generatedAt: Date,
      isVisible: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

// Index for faster querying by creator and status
surveySchema.index({ creator: 1 });
surveySchema.index({ closed: 1, expiryDate: 1 });

const Survey = mongoose.model('Survey', surveySchema);

module.exports = Survey; 