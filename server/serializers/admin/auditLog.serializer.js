const serializeAuditLog = (log) => {
  if (!log) return null;
  const doc = log.toObject ? log.toObject() : log;

  return {
    id: doc._id,
    actorId: doc.actorId ? (doc.actorId._id ? doc.actorId._id : doc.actorId) : null,
    actorName: doc.actorId && doc.actorId.name ? doc.actorId.name : 'System Admin',
    action: doc.action,
    targetId: doc.targetId || null,
    targetModel: doc.targetModel || null,
    beforeSnapshot: doc.beforeSnapshot || null,
    afterSnapshot: doc.afterSnapshot || null,
    details: doc.details || '',
    timestamp: doc.createdAt
  };
};

const serializeAuditLogs = (logs = []) => logs.map(serializeAuditLog);

module.exports = {
  serializeAuditLog,
  serializeAuditLogs
};
