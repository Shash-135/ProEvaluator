const cohortAdminService = require('../../services/admin/cohort.admin.service');
const { serializeCohort, serializeCohorts } = require('../../serializers/admin/cohort.serializer');

exports.createCohort = async (req, res) => {
  try {
    const cohort = await cohortAdminService.createCohort(req.body, req.user._id);
    return res.status(201).json({ cohort: serializeCohort(cohort) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.updateCohort = async (req, res) => {
  try {
    const cohort = await cohortAdminService.updateCohort(req.params.id, req.body, req.user._id);
    return res.json({ cohort: serializeCohort(cohort) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getCohorts = async (req, res) => {
  try {
    const cohorts = await cohortAdminService.getCohorts(req.query);
    return res.json({ cohorts: serializeCohorts(cohorts) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
