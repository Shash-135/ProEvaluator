const reportingAdminService = require('../../services/admin/reporting.admin.service');
const { serializeAuditLogs } = require('../../serializers/admin/auditLog.serializer');

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await reportingAdminService.getAuditLogs(req.query);
    return res.json({ logs: serializeAuditLogs(logs) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
