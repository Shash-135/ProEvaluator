const Team = require('../../models/Team');
const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const Milestone = require('../../models/Milestone');
const EvaluatorActionLog = require('../../models/EvaluatorActionLog');
const { updateProgressSummary } = require('./scoreAggregation.service');

const getLinkedTeams = async (externalUser) => {
  if (!externalUser.linkedExternalTo) return [];
  const teams = await Team.find({ assignedTeacherId: externalUser.linkedExternalTo })
    .populate('members', 'name email githubUsername')
    .populate({
      path: 'batchId',
      match: { isActive: true },
      select: 'name cohortId isActive',
      populate: { path: 'cohortId', select: 'name' }
    });
  return teams.filter(t => t.batchId != null);
};

const getTeamDetail = async (externalUser, teamId) => {
  if (!externalUser.linkedExternalTo) {
    throw new Error('Access denied: External evaluator is not linked to any teacher');
  }
  const team = await Team.findOne({ _id: teamId, assignedTeacherId: externalUser.linkedExternalTo }).populate('members', 'name email githubUsername');
  if (!team) {
    throw new Error('Team not found or access denied');
  }
  
  const scores = await StudentMilestoneScore.find({ teamId: team._id })
    .populate('studentId', 'name email')
    .populate('scores.milestoneId');
    
  return { team, scores };
};

const gradeExternalMilestone = async ({ externalUser, studentId, milestoneId, score, comments }) => {
  if (!externalUser.linkedExternalTo) {
    throw new Error('Access denied: External evaluator is not linked to any teacher');
  }

  const studentScore = await StudentMilestoneScore.findOne({ studentId, 'scores.milestoneId': milestoneId })
    .populate('teamId')
    .populate('scores.milestoneId');

  if (!studentScore || !studentScore.teamId || studentScore.teamId.assignedTeacherId.toString() !== externalUser.linkedExternalTo.toString()) {
    throw new Error('Access denied: Student not in linked teacher\'s assigned team');
  }

  const scoreItem = studentScore.scores.find(s => s.milestoneId && s.milestoneId._id.toString() === milestoneId.toString());
  if (!scoreItem) {
    throw new Error('Milestone not found for student');
  }

  if (!scoreItem.milestoneId.requiresExternalReview) {
    throw new Error('Milestone does not require external review');
  }

  // Validate score bounds
  const maxScore = scoreItem.milestoneId.maxScore || 100;
  if (score < 0 || score > maxScore) {
    throw new Error(`Score must be between 0 and ${maxScore}`);
  }

  const beforeSnapshot = { externalScore: scoreItem.externalScore, externalComments: scoreItem.externalComments, externalStatus: scoreItem.externalStatus };

  scoreItem.externalScore = score;
  scoreItem.externalComments = comments;
  scoreItem.externalStatus = 'graded';
  scoreItem.externalGradedBy = externalUser._id;
  scoreItem.externalGradedAt = new Date();

  await studentScore.save();

  // Update progress summary
  await updateProgressSummary(studentScore._id);

  // Log action
  await EvaluatorActionLog.create({
    actorId: externalUser._id,
    action: 'GRADE_EXTERNAL_MILESTONE',
    targetId: studentScore._id,
    targetModel: 'StudentMilestoneScore',
    beforeSnapshot,
    afterSnapshot: { externalScore: score, externalComments: comments, externalStatus: 'graded' },
    details: `External evaluator graded milestone ${milestoneId} for student ${studentId}`
  });

  return studentScore;
};

module.exports = {
  getLinkedTeams,
  getTeamDetail,
  gradeExternalMilestone
};
