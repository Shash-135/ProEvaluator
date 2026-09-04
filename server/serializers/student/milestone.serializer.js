function serializeMilestoneScore(scoreItem) {
  const milestone = scoreItem.milestoneId;
  const serialized = {
    _id: milestone._id || milestone,
    order: scoreItem.order,
    maxScore: scoreItem.maxScore,
    score: scoreItem.score,
    comments: scoreItem.comments,
    status: scoreItem.status,
    title: milestone.title,
    isOrphaned: scoreItem.isOrphaned
  };

  if (milestone.requiresExternalReview) {
    serialized.externalScore = scoreItem.externalScore;
    serialized.externalComments = scoreItem.externalComments;
    serialized.externalStatus = scoreItem.externalStatus;
  }

  return serialized;
}

function serializeStudentMilestones(scoreDoc) {
  if (!scoreDoc || !scoreDoc.scores) {
    return {
      progressSummary: { completed: 0, remaining: 0, totalScore: 0, percentComplete: 0 },
      scores: []
    };
  }

  return {
    progressSummary: scoreDoc.progressSummary,
    scores: scoreDoc.scores
      .filter(item => !item.isOrphaned)
      .map(serializeMilestoneScore)
  };
}

module.exports = { serializeStudentMilestones };
