const serializeScoreItem = (item, role, requiresExternalReview) => {
  const milestone = item.milestoneId || {};
  
  const baseItem = {
    milestoneId: milestone._id,
    order: item.order,
    status: item.status,
    title: milestone.title,
    dueDate: milestone.dueDate,
    maxScore: milestone.maxScore,
    requiresExternalReview
  };

  if (role === 'teacher') {
    // Teacher sees their own score as primary, external as secondary (if flagged)
    return {
      ...baseItem,
      score: item.score,
      comments: item.comments,
      gradedAt: item.gradedAt,
      externalScore: requiresExternalReview ? item.externalScore : undefined,
      externalStatus: requiresExternalReview ? item.externalStatus : undefined
    };
  } else if (role === 'external') {
    // External sees their score as primary (if flagged), teacher's as read-only context
    return {
      ...baseItem,
      externalScore: requiresExternalReview ? item.externalScore : undefined,
      externalComments: requiresExternalReview ? item.externalComments : undefined,
      externalStatus: requiresExternalReview ? item.externalStatus : undefined,
      teacherScore: item.score,
      teacherComments: item.comments,
      teacherStatus: item.status
    };
  }

  return baseItem;
};

const serializeStudentScores = (studentScoreDoc, role) => {
  if (!studentScoreDoc) return null;
  
  const student = studentScoreDoc.studentId || {};
  
  return {
    student: {
      _id: student._id || student,
      name: student.name,
      email: student.email,
      githubUsername: student.githubUsername
    },
    progressSummary: studentScoreDoc.progressSummary,
    scores: studentScoreDoc.scores
      .filter(item => !item.isOrphaned)
      .map(item => serializeScoreItem(item, role, item.milestoneId?.requiresExternalReview))
  };
};

module.exports = { serializeStudentScores };
