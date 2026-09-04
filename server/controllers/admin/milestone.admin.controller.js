const milestoneAdminService = require('../../services/admin/milestone.admin.service');
const { serializeMilestone, serializeMilestones } = require('../../serializers/admin/milestone.serializer');

exports.createMilestone = async (req, res) => {
  try {
    const milestone = await milestoneAdminService.createMilestone(req.body, req.user._id);
    return res.status(201).json({ milestone: serializeMilestone(milestone) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.updateMilestone = async (req, res) => {
  try {
    const milestone = await milestoneAdminService.updateMilestone(req.params.id, req.body, req.user._id);
    return res.json({ milestone: serializeMilestone(milestone) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const milestone = await milestoneAdminService.deleteMilestone(req.params.id, req.user._id);
    return res.json({ message: 'Milestone deleted successfully', milestone: serializeMilestone(milestone) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.reorderMilestones = async (req, res) => {
  try {
    const { batchId, orderedMilestoneIds } = req.body;
    const list = await milestoneAdminService.reorderMilestones(batchId, orderedMilestoneIds, req.user._id);
    return res.json({ milestones: serializeMilestones(list) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.reconcileScores = async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) return res.status(400).json({ error: 'batchId is required for reconciliation.' });

    const result = await milestoneAdminService.reconcileStudentMilestoneScores(batchId, req.user._id);
    return res.json({ message: 'Student milestone scores reconciled successfully', result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getMilestones = async (req, res) => {
  try {
    const { batchId } = req.query;
    if (!batchId) return res.status(400).json({ error: 'batchId query param required.' });
    const list = await milestoneAdminService.getMilestones(batchId);
    return res.json({ milestones: serializeMilestones(list) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
