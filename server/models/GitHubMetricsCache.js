const mongoose = require('mongoose');

const gitHubMetricsCacheSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    repoUrl: {
      type: String,
      required: true
    },
    commitCount: {
      type: Number,
      default: 0
    },
    linesAdded: {
      type: Number,
      default: 0
    },
    linesDeleted: {
      type: Number,
      default: 0
    },
    lastCommitAt: {
      type: Date
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    syncStatus: {
      type: String,
      enum: ['ok', 'rate_limited', 'error'],
      default: 'ok'
    },
    errorMessage: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

gitHubMetricsCacheSchema.index({ studentId: 1, teamId: 1 }, { unique: true });

module.exports = mongoose.model('GitHubMetricsCache', gitHubMetricsCacheSchema);
