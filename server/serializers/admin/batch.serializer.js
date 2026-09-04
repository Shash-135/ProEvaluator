const serializeBatch = (batch) => {
  if (!batch) return null;
  const doc = batch.toObject ? batch.toObject() : batch;

  return {
    id: doc._id,
    name: doc.name,
    minTeamSize: doc.minTeamSize,
    maxTeamSize: doc.maxTeamSize,
    cohortId: doc.cohortId,
    isActive: doc.isActive !== false,
    createdBy: doc.createdBy || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const serializeBatches = (batches = []) => batches.map(serializeBatch);

module.exports = {
  serializeBatch,
  serializeBatches
};
