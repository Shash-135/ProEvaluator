const reportingAdminService = require('../../services/admin/reporting.admin.service');
const { serializeBatchReport, serializeTeacherWorkload } = require('../../serializers/admin/report.serializer');

exports.getBatchAnalytics = async (req, res) => {
  try {
    const { batchId } = req.params;
    const report = await reportingAdminService.getBatchAnalytics(batchId);
    return res.json({ report: serializeBatchReport(report) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getFacultyWorkload = async (req, res) => {
  try {
    const list = await reportingAdminService.getFacultyWorkloadOverview();
    return res.json({ workload: list.map(serializeTeacherWorkload) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
