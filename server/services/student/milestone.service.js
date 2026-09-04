const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const Team = require('../../models/Team');

class MilestoneService {
  async getOwnMilestoneScores(studentId) {
    const team = await Team.findOne({ members: studentId });
    if (!team) {
      return { hasTeam: false };
    }

    const scoreDoc = await StudentMilestoneScore.findOne({ studentId, teamId: team._id })
      .populate('scores.milestoneId');

    if (!scoreDoc) {
      return {
        hasTeam: true,
        progressSummary: { completed: 0, remaining: 0, totalScore: 0, percentComplete: 0 },
        scores: []
      };
    }

    return {
      hasTeam: true,
      progressSummary: scoreDoc.progressSummary,
      scores: scoreDoc.scores
    };
  }
}

module.exports = new MilestoneService();
