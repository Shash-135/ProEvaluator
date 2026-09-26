const Cohort = require('../../models/Cohort');
const Batch = require('../../models/Batch');
const Team = require('../../models/Team');
const Milestone = require('../../models/Milestone');
const User = require('../../models/User');
const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const GitHubMetricsCache = require('../../models/GitHubMetricsCache');
const AdminActionLog = require('../../models/AdminActionLog');

class CohortAdminService {
  async createCohort(data, adminId) {
    const { name } = data;
    const cohort = await Cohort.create({
      name,
      createdBy: adminId,
      isActive: true
    });

    await AdminActionLog.create({
      actorId: adminId,
      action: 'cohort.create',
      targetId: cohort._id,
      targetModel: 'Cohort',
      afterSnapshot: cohort.toObject(),
      details: `Created cohort '${cohort.name}'`
    });

    return cohort;
  }

  async updateCohort(cohortId, data, adminId) {
    const before = await Cohort.findById(cohortId);
    if (!before) throw new Error('Cohort not found.');

    const beforeSnap = before.toObject();
    if (data.name !== undefined) before.name = data.name;
    if (data.isActive !== undefined) before.isActive = data.isActive;

    await before.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'cohort.update',
      targetId: before._id,
      targetModel: 'Cohort',
      beforeSnapshot: beforeSnap,
      afterSnapshot: before.toObject(),
      details: `Updated cohort '${before.name}' settings`
    });

    return before;
  }

  async deleteCohort(cohortId, adminId) {
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) throw new Error('Cohort not found.');

    const beforeSnap = cohort.toObject();

    // Find all batches belonging to this cohort
    const batches = await Batch.find({ cohortId });
    const batchIds = batches.map((b) => b._id);

    if (batchIds.length > 0) {
      // Find all teams in these batches
      const teams = await Team.find({ batchId: { $in: batchIds } });
      const teamIds = teams.map((t) => t._id);

      // Clean up downstream scores and metric caches for teams
      if (teamIds.length > 0) {
        await StudentMilestoneScore.deleteMany({ teamId: { $in: teamIds } });
        await GitHubMetricsCache.deleteMany({ teamId: { $in: teamIds } });
        await Team.deleteMany({ _id: { $in: teamIds } });
      }

      // Delete milestones in these batches
      await Milestone.deleteMany({ batchId: { $in: batchIds } });

      // Delete the batches
      await Batch.deleteMany({ _id: { $in: batchIds } });
    }

    // Unset cohortId on any users assigned to this cohort
    await User.updateMany({ cohortId }, { $unset: { cohortId: '' } });

    // Delete cohort
    await Cohort.findByIdAndDelete(cohortId);

    await AdminActionLog.create({
      actorId: adminId,
      action: 'cohort.delete',
      targetId: cohortId,
      targetModel: 'Cohort',
      beforeSnapshot: beforeSnap,
      details: `Deleted cohort '${cohort.name}' and cascade removed ${batchIds.length} associated batches`
    });

    return { deletedCohortId: cohortId, name: cohort.name };
  }

  async getCohorts(filter = {}) {
    return await Cohort.find(filter).sort({ createdAt: -1 });
  }
}

module.exports = new CohortAdminService();
