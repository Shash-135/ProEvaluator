const serializeTeam = (team) => {
  if (!team) return null;
  const doc = team.toObject ? team.toObject() : team;

  return {
    id: doc._id,
    name: doc.name,
    batchId: doc.batchId ? (doc.batchId._id ? doc.batchId._id : doc.batchId) : null,
    batch: doc.batchId && doc.batchId.name ? { id: doc.batchId._id, name: doc.batchId.name } : null,
    status: doc.status,
    repoUrl: doc.repoUrl || null,
    assignedTeacherId: doc.assignedTeacherId ? (doc.assignedTeacherId._id ? doc.assignedTeacherId._id : doc.assignedTeacherId) : null,
    assignedTeacher: doc.assignedTeacherId && doc.assignedTeacherId.name ? { id: doc.assignedTeacherId._id, name: doc.assignedTeacherId.name, email: doc.assignedTeacherId.email } : null,
    members: Array.isArray(doc.members)
      ? doc.members.map((m) => (m && m._id ? { id: m._id, name: m.name, email: m.email, githubUsername: m.githubUsername } : m))
      : [],
    memberCount: Array.isArray(doc.members) ? doc.members.length : 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const serializeTeams = (teams = []) => teams.map(serializeTeam);

module.exports = {
  serializeTeam,
  serializeTeams
};
