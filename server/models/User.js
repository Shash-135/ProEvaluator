const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['admin', 'teacher', 'external', 'student'],
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String, // optional, for local dev/seed accounts
      select: false
    },
    authProvider: {
      type: String,
      enum: ['google', 'github', 'local'],
      default: 'local'
    },
    providerId: {
      type: String
    },
    githubUsername: {
      type: String,
      trim: true
    },
    githubAccessToken: {
      type: String,
      select: false
    },
    cohortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cohort',
      index: true
    },
    linkedExternalTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    linkedInternalEvaluator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    resetTokenHash: {
      type: String,
      select: false
    },
    resetTokenExpiry: {
      type: Date,
      select: false
    },
    tokenVersion: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ role: 1, cohortId: 1 });

module.exports = mongoose.model('User', userSchema);
