const Batch = require('../models/Batch');
const User = require('../models/User');
const Team = require('../models/Team');
const Milestone = require('../models/Milestone');
const { ROLES } = require('../constants');

exports.createBatch = async (req, res) => {
  try {
    const { name, minTeamSize, maxTeamSize, cohortId } = req.body;
    const batch = await Batch.create({
      name,
      minTeamSize: minTeamSize || 2,
      maxTeamSize: maxTeamSize || 4,
      cohortId,
      createdBy: req.user._id
    });
    return res.status(201).json({ batch });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create batch: ' + error.message });
  }
};

exports.getBatches = async (req, res) => {
  try {
    const { cohortId } = req.query;
    const filter = {};
    if (cohortId) filter.cohortId = cohortId;
    if (req.user && req.user.role !== ROLES.ADMIN) filter.isActive = true;
    const batches = await Batch.find(filter).sort({ createdAt: -1 });
    return res.json({ batches });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch batches: ' + error.message });
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(440).json({ error: 'Batch not found.' });

    const milestones = await Milestone.find({ batchId: batch._id }).sort({ order: 1 });
    // We don't have students directly tied to batchId anymore, we tie to cohortId.
    // If needed, you could query teams for this batch, then count unique students.
    // Let's just return 0 or calculate from teams if required.
    const teamsCount = await Team.countDocuments({ batchId: batch._id });
    const studentsCount = 0; // Deprecated for direct batch link

    return res.json({
      batch,
      milestones,
      stats: { teamsCount, studentsCount }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch batch details: ' + error.message });
  }
};

exports.getBatchRoster = async (req, res) => {
  try {
    const batchId = req.params.id;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(440).json({ error: 'Batch not found.' });

    const students = await User.find({ cohortId: batch.cohortId, role: ROLES.STUDENT }).select('-password');
    const teachers = await User.find({ role: ROLES.TEACHER }).select('-password');
    return res.json({ students, teachers });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch batch roster: ' + error.message });
  }
};

exports.setActiveBatch = async (req, res) => {
  try {
    const batchId = req.params.id;
    const { isActive } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found.' });

    if (isActive) {
      // Set all other batches in the same cohort to inactive
      await Batch.updateMany(
        { cohortId: batch.cohortId, _id: { $ne: batch._id } },
        { $set: { isActive: false } }
      );
    }

    // Update this batch
    batch.isActive = !!isActive;
    await batch.save();

    return res.json({ message: 'Batch activated successfully', batch });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to set active batch: ' + error.message });
  }
};
