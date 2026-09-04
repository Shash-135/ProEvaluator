const serializeMilestone = (milestone) => {
  if (!milestone) return null;
  const doc = milestone.toObject ? milestone.toObject() : milestone;

  return {
    id: doc._id,
    batchId: doc.batchId,
    order: doc.order,
    title: doc.title,
    maxScore: doc.maxScore,
    rubric: doc.rubric || '',
    dueDate: doc.dueDate || null,
    createdAt: doc.createdAt
  };
};

const serializeMilestones = (milestones = []) => milestones.map(serializeMilestone);

module.exports = {
  serializeMilestone,
  serializeMilestones
};
