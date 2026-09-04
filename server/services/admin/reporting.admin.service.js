const Batch = require('../../models/Batch');
const Team = require('../../models/Team');
const User = require('../../models/User');
const Milestone = require('../../models/Milestone');
const JoinRequest = require('../../models/JoinRequest');
const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const AdminActionLog = require('../../models/AdminActionLog');
const { ROLES, JOIN_REQUEST_STATUS } = require('../../constants');

class ReportingAdminService {
  async getBatchAnalytics(batchId) {
    const batch = await Batch.findById(batchId);
    if (!batch) throw new Error('Batch not found.');

    const totalTeams = await Team.countDocuments({ batchId: batch._id });
    const totalStudents = await User.countDocuments({ batchId: batch._id, role: ROLES.STUDENT });
    const unassignedTeams = await Team.countDocuments({
      batchId: batch._id,
      $or: [{ assignedTeacherId: null }, { assignedTeacherId: { $exists: false } }]
    });

    const pendingJoinRequests = await JoinRequest.countDocuments({
      batchId: batch._id,
      status: JOIN_REQUEST_STATUS.PENDING
    });

    // Calculate overall average milestone completion %
    const scoreDocs = await StudentMilestoneScore.find({ batchId: batch._id });
    let totalCompletionSum = 0;
    if (scoreDocs.length > 0) {
      scoreDocs.forEach((doc) => {
        totalCompletionSum += doc.progressSummary?.percentComplete || 0;
      });
    }

    const overallCompletionPercent = scoreDocs.length > 0 ? Math.round(totalCompletionSum / scoreDocs.length) : 0;

    return {
      batchId: batch._id,
      batchName: batch.name,
      totalTeams,
      totalStudents,
      unassignedTeams,
      pendingJoinRequests,
      overallCompletionPercent
    };
  }

  async getFacultyWorkloadOverview() {
    const teachers = await User.find({ role: ROLES.TEACHER }).select('name email');
    const workloadList = [];

    for (const teacher of teachers) {
      const assignedTeams = await Team.find({ assignedTeacherId: teacher._id }).select('name members');
      const teamIds = assignedTeams.map((t) => t._id);

      const scoreDocs = await StudentMilestoneScore.find({ teamId: { $in: teamIds } });
      let completionSum = 0;
      if (scoreDocs.length > 0) {
        scoreDocs.forEach((doc) => {
          completionSum += doc.progressSummary?.percentComplete || 0;
        });
      }

      const avgCompletion = scoreDocs.length > 0 ? Math.round(completionSum / scoreDocs.length) : 0;

      workloadList.push({
        teacherId: teacher._id,
        name: teacher.name,
        email: teacher.email,
        assignedTeamCount: assignedTeams.length,
        averageCompletionPercent: avgCompletion,
        teams: assignedTeams.map((t) => ({ id: t._id, name: t.name, memberCount: t.members.length }))
      });
    }

    return workloadList;
  }

  async getAuditLogs(filters = {}) {
    const query = {};
    if (filters.action) query.action = filters.action;
    if (filters.actorId) query.actorId = filters.actorId;

    return await AdminActionLog.find(query)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);
  }
}

module.exports = new ReportingAdminService();
