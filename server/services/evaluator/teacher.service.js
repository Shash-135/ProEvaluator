const Team = require('../../models/Team');
const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const Milestone = require('../../models/Milestone');
const EvaluatorActionLog = require('../../models/EvaluatorActionLog');
const { updateProgressSummary } = require('./scoreAggregation.service');

const getAssignedTeams = async (teacherId) => {
  const teams = await Team.find({ assignedTeacherId: teacherId })
    .populate('members', 'name email githubUsername')
    .populate({
      path: 'batchId',
      match: { isActive: true },
      select: 'name cohortId isActive',
      populate: { path: 'cohortId', select: 'name' }
    });
  return teams.filter(t => t.batchId != null);
};

const getTeamDetail = async (teacherId, teamId) => {
  const team = await Team.findOne({ _id: teamId, assignedTeacherId: teacherId }).populate('members', 'name email githubUsername');
  if (!team) {
    throw new Error('Team not found or access denied');
  }
  
  const scores = await StudentMilestoneScore.find({ teamId: team._id })
    .populate('studentId', 'name email')
    .populate('scores.milestoneId');
    
  return { team, scores };
};

const gradeStudentMilestone = async ({ teacherId, studentId, milestoneId, score, comments }) => {
  // First, find the student's team to ensure it's assigned to this teacher
  const studentScore = await StudentMilestoneScore.findOne({ studentId, 'scores.milestoneId': milestoneId })
    .populate('teamId')
    .populate('scores.milestoneId');

  if (!studentScore || !studentScore.teamId || studentScore.teamId.assignedTeacherId.toString() !== teacherId.toString()) {
    throw new Error('Access denied: Student not in assigned team');
  }

  const scoreItem = studentScore.scores.find(s => s.milestoneId && s.milestoneId._id.toString() === milestoneId.toString());
  if (!scoreItem) {
    throw new Error('Milestone not found for student');
  }

  // Validate score bounds
  const maxScore = scoreItem.milestoneId.maxScore || 100;
  if (score < 0 || score > maxScore) {
    throw new Error(`Score must be between 0 and ${maxScore}`);
  }

  const beforeSnapshot = { score: scoreItem.score, comments: scoreItem.comments, status: scoreItem.status };

  scoreItem.score = score;
  scoreItem.comments = comments;
  scoreItem.status = 'graded';
  scoreItem.gradedBy = teacherId;
  scoreItem.gradedAt = new Date();

  await studentScore.save();

  // Update progress summary
  await updateProgressSummary(studentScore._id);

  // Log action
  await EvaluatorActionLog.create({
    actorId: teacherId,
    action: 'GRADE_MILESTONE',
    targetId: studentScore._id,
    targetModel: 'StudentMilestoneScore',
    beforeSnapshot,
    afterSnapshot: { score, comments, status: 'graded' },
    details: `Teacher graded milestone ${milestoneId} for student ${studentId}`
  });

  return studentScore;
};

const getWorkloadSummary = async (teacherId) => {
  const teams = await Team.find({ assignedTeacherId: teacherId });
  const teamIds = teams.map(t => t._id);
  
  const scores = await StudentMilestoneScore.find({ teamId: { $in: teamIds } });
  
  let totalPercent = 0;
  scores.forEach(s => {
    totalPercent += s.progressSummary?.percentComplete || 0;
  });
  
  const averageCompletion = scores.length > 0 ? (totalPercent / scores.length) : 0;
  
  return {
    assignedTeamsCount: teams.length,
    studentsCount: scores.length,
    averageCompletion
  };
};

module.exports = {
  getAssignedTeams,
  getTeamDetail,
  gradeStudentMilestone,
  getWorkloadSummary
};
