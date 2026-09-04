exports.serializeCohort = (cohort) => {
  if (!cohort) return null;
  return {
    id: cohort._id,
    name: cohort.name,
    isActive: cohort.isActive,
    createdAt: cohort.createdAt
  };
};

exports.serializeCohorts = (cohorts) => {
  if (!cohorts) return [];
  return cohorts.map(exports.serializeCohort);
};
