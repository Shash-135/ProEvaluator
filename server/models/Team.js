const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    assignedTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    status: {
      type: String,
      enum: ['forming', 'active', 'completed'],
      default: 'forming'
    },
    repoUrl: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

teamSchema.index({ assignedTeacherId: 1, batchId: 1 });

module.exports = mongoose.model('Team', teamSchema);
