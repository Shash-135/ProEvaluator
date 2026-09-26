const Batch = require('../../models/Batch');
const Team = require('../../models/Team');
const Milestone = require('../../models/Milestone');
const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const GitHubMetricsCache = require('../../models/GitHubMetricsCache');
const AdminActionLog = require('../../models/AdminActionLog');

class BatchAdminService {
  async createBatch(data, adminId) {
    const { name, minTeamSize, maxTeamSize, cohortId } = data;
    const batch = await Batch.create({
      name,
      minTeamSize: minTeamSize || 2,
      maxTeamSize: maxTeamSize || 4,
      cohortId,
      createdBy: adminId,
      isActive: true
    });

    await AdminActionLog.create({
      actorId: adminId,
      action: 'batch.create',
      targetId: batch._id,
      targetModel: 'Batch',
      afterSnapshot: batch.toObject(),
      details: `Created semester/batch '${batch.name}'`
    });

    return batch;
  }

  async updateBatch(batchId, data, adminId) {
    const before = await Batch.findById(batchId);
    if (!before) throw new Error('Batch not found.');

    const beforeSnap = before.toObject();
    if (data.name !== undefined) before.name = data.name;
    if (data.cohortId !== undefined) before.cohortId = data.cohortId;
    if (data.minTeamSize !== undefined) before.minTeamSize = data.minTeamSize;
    if (data.maxTeamSize !== undefined) before.maxTeamSize = data.maxTeamSize;
    if (data.isActive !== undefined) before.isActive = data.isActive;

    await before.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'batch.update',
      targetId: before._id,
      targetModel: 'Batch',
      beforeSnapshot: beforeSnap,
      afterSnapshot: before.toObject(),
      details: `Updated semester/batch '${before.name}' settings`
    });

    return before;
  }

  async updateTeamSizing(batchId, minTeamSize, maxTeamSize, adminId) {
    const before = await Batch.findById(batchId);
    if (!before) throw new Error('Batch not found.');

    const beforeSnap = before.toObject();
    if (minTeamSize !== undefined) before.minTeamSize = minTeamSize;
    if (maxTeamSize !== undefined) before.maxTeamSize = maxTeamSize;

    await before.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'batch.update_team_sizing',
      targetId: before._id,
      targetModel: 'Batch',
      beforeSnapshot: beforeSnap,
      afterSnapshot: before.toObject(),
      details: `Updated team sizing bounds (min: ${before.minTeamSize}, max: ${before.maxTeamSize})`
    });

    return before;
  }

  async archiveBatch(batchId, adminId) {
    return this.updateBatch(batchId, { isActive: false }, adminId);
  }

  async deleteBatch(batchId, adminId) {
    const batch = await Batch.findById(batchId);
    if (!batch) throw new Error('Batch not found.');

    const beforeSnap = batch.toObject();

    // Find and delete all teams in this batch with downstream cleanup
    const teams = await Team.find({ batchId });
    const teamIds = teams.map((t) => t._id);

    if (teamIds.length > 0) {
      await StudentMilestoneScore.deleteMany({ teamId: { $in: teamIds } });
      await GitHubMetricsCache.deleteMany({ teamId: { $in: teamIds } });
      await Team.deleteMany({ _id: { $in: teamIds } });
    }

    // Delete milestones in this batch
    await Milestone.deleteMany({ batchId });

    // Delete the batch
    await Batch.findByIdAndDelete(batchId);

    await AdminActionLog.create({
      actorId: adminId,
      action: 'batch.delete',
      targetId: batchId,
      targetModel: 'Batch',
      beforeSnapshot: beforeSnap,
      details: `Deleted semester/batch '${batch.name}' and cascade removed ${teamIds.length} teams and all milestones`
    });

    return { deletedBatchId: batchId, name: batch.name };
  }

  async getBatches(filter = {}) {
    return await Batch.find(filter).sort({ createdAt: -1 });
  }
}

module.exports = new BatchAdminService();
