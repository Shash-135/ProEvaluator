function serializeProfile(userDoc) {
  if (!userDoc) return null;

  // Exclude providerId, linkedExternalTo, linkedInternalEvaluator, and role
  return {
    _id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    githubUsername: userDoc.githubUsername,
    batchId: userDoc.batchId,
    isActive: userDoc.isActive,
    createdAt: userDoc.createdAt
  };
}

module.exports = { serializeProfile };
