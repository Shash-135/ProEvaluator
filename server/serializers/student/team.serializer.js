function serializeTeam(teamDoc) {
  if (!teamDoc) return null;

  return {
    _id: teamDoc._id,
    name: teamDoc.name,
    repoUrl: teamDoc.repoUrl,
    status: teamDoc.status,
    members: (teamDoc.members || []).map(m => ({
      _id: m._id,
      name: m.name,
      githubUsername: m.githubUsername
    }))
  };
}

module.exports = { serializeTeam };
