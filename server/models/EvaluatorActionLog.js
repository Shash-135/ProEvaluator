const mongoose = require('mongoose');

const evaluatorActionLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    targetModel: {
      type: String
    },
    beforeSnapshot: {
      type: mongoose.Schema.Types.Mixed
    },
    afterSnapshot: {
      type: mongoose.Schema.Types.Mixed
    },
    details: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('EvaluatorActionLog', evaluatorActionLogSchema);
