/**
 * User DTO Serializer - Explicitly excludes OAuth internals (providerId, tokens) and secrets.
 */
const serializeUser = (user) => {
  if (!user) return null;
  const doc = user.toObject ? user.toObject() : user;

  return {
    id: doc._id,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    isActive: doc.isActive !== false,
    githubUsername: doc.githubUsername || null,
    cohortId: doc.cohortId ? (doc.cohortId._id ? doc.cohortId._id : doc.cohortId) : null,
    cohort: doc.cohortId && doc.cohortId.name ? { id: doc.cohortId._id, name: doc.cohortId.name } : null,
    linkedExternalTo: doc.linkedExternalTo ? (doc.linkedExternalTo._id ? { id: doc.linkedExternalTo._id, name: doc.linkedExternalTo.name, email: doc.linkedExternalTo.email } : doc.linkedExternalTo) : null,
    linkedInternalEvaluator: doc.linkedInternalEvaluator ? (doc.linkedInternalEvaluator._id ? { id: doc.linkedInternalEvaluator._id, name: doc.linkedInternalEvaluator.name, email: doc.linkedInternalEvaluator.email } : doc.linkedInternalEvaluator) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const serializeUsers = (users = []) => users.map(serializeUser);

module.exports = {
  serializeUser,
  serializeUsers
};
