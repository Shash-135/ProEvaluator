const serializeTeam = (team) => {
  if (!team) return null;
  
  // Scrub auth internals (providerId, external links)
  const members = team.members ? team.members.map(member => ({
    _id: member._id,
    name: member.name,
    email: member.email,
    githubUsername: member.githubUsername
  })) : [];
  
  return {
    _id: team._id,
    name: team.name,
    repoUrl: team.repoUrl,
    batch: team.batchId ? (team.batchId._id ? {
      _id: team.batchId._id,
      name: team.batchId.name,
      cohort: team.batchId.cohortId ? {
        _id: team.batchId.cohortId._id || team.batchId.cohortId,
        name: team.batchId.cohortId.name || 'Unknown Cohort'
      } : null
    } : team.batchId) : null,
    members,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt
  };
};

module.exports = { serializeTeam };
