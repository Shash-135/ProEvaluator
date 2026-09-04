const mongoose = require('mongoose');

const scoreItemSchema = new mongoose.Schema(
  {
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    score: {
      type: Number,
      default: 0
    },
    maxScore: {
      type: Number,
      default: 100
    },
    status: {
      type: String,
      enum: ['pending', 'graded'],
      default: 'pending'
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: {
      type: String,
      default: ''
    },
    gradedAt: {
      type: Date
    },
    isOrphaned: {
      type: Boolean,
      default: false
    },
    externalScore: {
      type: Number,
      default: 0
    },
    externalComments: {
      type: String,
      default: ''
    },
    externalGradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    externalGradedAt: {
      type: Date
    },
    externalStatus: {
      type: String,
      enum: ['pending', 'graded'],
      default: 'pending'
    }
  },
  { _id: false }
);

const studentMilestoneScoreSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      index: true
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true
    },
    scores: [scoreItemSchema],
    progressSummary: {
      completed: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
      percentComplete: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

studentMilestoneScoreSchema.index({ studentId: 1, batchId: 1 }, { unique: true });

module.exports = mongoose.model('StudentMilestoneScore', studentMilestoneScoreSchema);
