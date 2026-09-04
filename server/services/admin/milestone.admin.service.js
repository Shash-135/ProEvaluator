const Milestone = require('../../models/Milestone');
const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const AdminActionLog = require('../../models/AdminActionLog');
const { MILESTONE_STATUS } = require('../../constants');
const { updateProgressSummary } = require('../evaluator/scoreAggregation.service');

class MilestoneAdminService {
  async getMilestones(batchId) {
    return await Milestone.find({ batchId }).sort({ order: 1 });
  }

  async createMilestone(data, adminId) {
    const { batchId, order, title, maxScore, rubric, dueDate } = data;
    const milestone = await Milestone.create({
      batchId,
      order,
      title,
      maxScore: maxScore || 100,
      rubric,
      dueDate
    });

    await AdminActionLog.create({
      actorId: adminId,
      action: 'milestone.create',
      targetId: milestone._id,
      targetModel: 'Milestone',
      afterSnapshot: milestone.toObject(),
      details: `Created milestone ${milestone.order} '${milestone.title}' for batch ${batchId}`
    });

    return milestone;
  }

  async updateMilestone(milestoneId, data, adminId) {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) throw new Error('Milestone not found.');

    const beforeSnap = milestone.toObject();
    if (data.title !== undefined) milestone.title = data.title;
    if (data.order !== undefined) milestone.order = data.order;
    if (data.maxScore !== undefined) milestone.maxScore = data.maxScore;
    if (data.rubric !== undefined) milestone.rubric = data.rubric;
    if (data.dueDate !== undefined) milestone.dueDate = data.dueDate;

    await milestone.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'milestone.update',
      targetId: milestone._id,
      targetModel: 'Milestone',
      beforeSnapshot: beforeSnap,
      afterSnapshot: milestone.toObject(),
      details: `Updated milestone ${milestone.order} '${milestone.title}'`
    });

    return milestone;
  }

  async deleteMilestone(milestoneId, adminId) {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) throw new Error('Milestone not found.');

    const beforeSnap = milestone.toObject();
    await Milestone.findByIdAndDelete(milestoneId);

    await AdminActionLog.create({
      actorId: adminId,
      action: 'milestone.delete',
      targetId: milestoneId,
      targetModel: 'Milestone',
      beforeSnapshot: beforeSnap,
      details: `Deleted milestone ${milestone.order} '${milestone.title}'`
    });

    return milestone;
  }

  async reorderMilestones(batchId, orderedMilestoneIds = [], adminId) {
    for (let i = 0; i < orderedMilestoneIds.length; i++) {
      await Milestone.findByIdAndUpdate(orderedMilestoneIds[i], { order: i + 1 });
    }

    const updatedList = await Milestone.find({ batchId }).sort({ order: 1 });

    await AdminActionLog.create({
      actorId: adminId,
      action: 'milestone.reorder',
      targetId: batchId,
      targetModel: 'Batch',
      details: `Reordered ${orderedMilestoneIds.length} milestones for batch ${batchId}`
    });

    return updatedList;
  }

  /**
   * Reconcile all student score documents for a batch.
   * STRICTLY IDEMPOTENT: Running multiple times produces identical results.
   */
  async reconcileStudentMilestoneScores(batchId, adminId) {
    const activeMilestones = await Milestone.find({ batchId }).sort({ order: 1 });
    const activeMap = new Map();
    activeMilestones.forEach((m) => activeMap.set(m._id.toString(), m));

    const studentScoreDocs = await StudentMilestoneScore.find({ batchId });
    let updatedCount = 0;

    for (const doc of studentScoreDocs) {
      const existingScoresMap = new Map();
      doc.scores.forEach((s) => existingScoresMap.set(s.milestoneId.toString(), s));

      const newScoresArray = [];

      // 1. Process active milestones
      activeMilestones.forEach((m) => {
        const key = m._id.toString();
        if (existingScoresMap.has(key)) {
          const existing = existingScoresMap.get(key);
          newScoresArray.push({
            milestoneId: m._id,
            order: m.order,
            score: existing.score || 0,
            maxScore: m.maxScore,
            status: existing.status || MILESTONE_STATUS.PENDING,
            gradedBy: existing.gradedBy || null,
            comments: existing.comments || '',
            gradedAt: existing.gradedAt || null,
            isOrphaned: false,
            externalScore: existing.externalScore || 0,
            externalComments: existing.externalComments || '',
            externalGradedBy: existing.externalGradedBy || null,
            externalGradedAt: existing.externalGradedAt || null,
            externalStatus: existing.externalStatus || MILESTONE_STATUS.PENDING
          });
          existingScoresMap.delete(key);
        } else {
          // Missing milestone entry -> insert pending
          newScoresArray.push({
            milestoneId: m._id,
            order: m.order,
            score: 0,
            maxScore: m.maxScore,
            status: MILESTONE_STATUS.PENDING,
            gradedBy: null,
            comments: '',
            gradedAt: null,
            isOrphaned: false,
            externalScore: 0,
            externalComments: '',
            externalGradedBy: null,
            externalGradedAt: null,
            externalStatus: MILESTONE_STATUS.PENDING
          });
        }
      });

      // 2. Process orphaned entries (scores for deleted milestones)
      existingScoresMap.forEach((orphanedScore) => {
        newScoresArray.push({
          milestoneId: orphanedScore.milestoneId,
          order: orphanedScore.order || 99,
          score: orphanedScore.score || 0,
          maxScore: orphanedScore.maxScore || 100,
          status: orphanedScore.status || MILESTONE_STATUS.PENDING,
          gradedBy: orphanedScore.gradedBy || null,
          comments: orphanedScore.comments || '',
          gradedAt: orphanedScore.gradedAt || null,
          isOrphaned: true,
          externalScore: orphanedScore.externalScore || 0,
          externalComments: orphanedScore.externalComments || '',
          externalGradedBy: orphanedScore.externalGradedBy || null,
          externalGradedAt: orphanedScore.externalGradedAt || null,
          externalStatus: orphanedScore.externalStatus || MILESTONE_STATUS.PENDING
        });
      });

      // Sort by order
      newScoresArray.sort((a, b) => a.order - b.order);

      doc.scores = newScoresArray;
      await doc.save();
      await updateProgressSummary(doc._id);
      updatedCount += 1;
    }

    await AdminActionLog.create({
      actorId: adminId,
      action: 'milestone.reconcile',
      targetId: batchId,
      targetModel: 'Batch',
      details: `Reconciled milestone scores for ${updatedCount} students in batch ${batchId}`
    });

    return {
      batchId,
      studentsReconciled: updatedCount,
      activeMilestoneCount: activeMilestones.length
    };
  }
}

module.exports = new MilestoneAdminService();
