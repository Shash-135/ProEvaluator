const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true
    },
    order: {
      type: Number,
      required: true,
      min: 1
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    maxScore: {
      type: Number,
      required: true,
      default: 100
    },
    rubric: {
      type: String,
      trim: true
    },
    requiresExternalReview: {
      type: Boolean,
      default: false
    },
    dueDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

milestoneSchema.index({ batchId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Milestone', milestoneSchema);
