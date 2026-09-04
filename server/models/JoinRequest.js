const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true
    },
    fromStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    toStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

joinRequestSchema.index({ toStudent: 1, status: 1 });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
