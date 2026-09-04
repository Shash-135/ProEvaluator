const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const Milestone = require('../../models/Milestone');

/**
 * Calculates and updates the progressSummary for a given student's milestone scores.
 * 
 * @param {ObjectId} studentScoreId - The ID of the StudentMilestoneScore document
 * @returns {Promise<Object>} The updated StudentMilestoneScore document
 */
async function updateProgressSummary(studentScoreId) {
  const studentScore = await StudentMilestoneScore.findById(studentScoreId).populate('scores.milestoneId');
  if (!studentScore) {
    throw new Error('StudentMilestoneScore not found');
  }

  let completed = 0;
  let remaining = 0;
  let totalScore = 0;

  studentScore.scores.forEach(item => {
    // Ignore orphaned scores for calculation
    if (item.isOrphaned) {
      return;
    }

    const milestone = item.milestoneId;
    if (!milestone) return;

    let itemFinalScore = 0;
    
    // Weighting logic
    if (milestone.requiresExternalReview) {
      // For requiresExternalReview milestones, totalScore = (score + externalScore) / 2
      if (item.status === 'graded' && item.externalStatus === 'graded') {
        itemFinalScore = (item.score + item.externalScore) / 2;
        completed += 1;
      } else {
        // If one is graded but not both, it's still remaining
        remaining += 1;
      }
    } else {
      // Default weighting: 100% teacher score for standard milestones.
      // If toggled off after externalScore exists, preserve as historical read-only but exclude from progressSummary.
      if (item.status === 'graded') {
        itemFinalScore = item.score;
        completed += 1;
      } else {
        remaining += 1;
      }
    }

    totalScore += itemFinalScore;
  });

  const totalMilestones = completed + remaining;
  const percentComplete = totalMilestones > 0 ? (completed / totalMilestones) * 100 : 0;

  studentScore.progressSummary = {
    completed,
    remaining,
    totalScore,
    percentComplete
  };

  await studentScore.save();
  return studentScore;
}

module.exports = {
  updateProgressSummary
};
