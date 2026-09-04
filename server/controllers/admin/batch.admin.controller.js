const batchAdminService = require('../../services/admin/batch.admin.service');
const { serializeBatch, serializeBatches } = require('../../serializers/admin/batch.serializer');

exports.createBatch = async (req, res) => {
  try {
    const batch = await batchAdminService.createBatch(req.body, req.user._id);
    return res.status(201).json({ batch: serializeBatch(batch) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const batch = await batchAdminService.updateBatch(req.params.id, req.body, req.user._id);
    return res.json({ batch: serializeBatch(batch) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.updateTeamSizing = async (req, res) => {
  try {
    const { minTeamSize, maxTeamSize } = req.body;
    const batch = await batchAdminService.updateTeamSizing(req.params.id, minTeamSize, maxTeamSize, req.user._id);
    return res.json({ message: 'Team sizing limits updated', batch: serializeBatch(batch) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.archiveBatch = async (req, res) => {
  try {
    const batch = await batchAdminService.archiveBatch(req.params.id, req.user._id);
    return res.json({ message: 'Batch archived successfully', batch: serializeBatch(batch) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getBatches = async (req, res) => {
  try {
    const batches = await batchAdminService.getBatches(req.query);
    return res.json({ batches: serializeBatches(batches) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
