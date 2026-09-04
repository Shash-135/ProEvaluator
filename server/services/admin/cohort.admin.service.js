const Cohort = require('../../models/Cohort');
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

  async getCohorts(filter = {}) {
    return await Cohort.find(filter).sort({ createdAt: -1 });
  }
}

module.exports = new CohortAdminService();
