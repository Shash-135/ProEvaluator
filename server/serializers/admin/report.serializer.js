const serializeBatchReport = (report) => {
  return {
    batchId: report.batchId,
    batchName: report.batchName,
    totalTeams: report.totalTeams,
    totalStudents: report.totalStudents,
    unassignedTeams: report.unassignedTeams,
    pendingJoinRequests: report.pendingJoinRequests,
    overallCompletionPercent: report.overallCompletionPercent
  };
};

const serializeTeacherWorkload = (workload) => {
  return {
    teacherId: workload.teacherId,
    name: workload.name,
    email: workload.email,
    assignedTeamCount: workload.assignedTeamCount,
    averageCompletionPercent: workload.averageCompletionPercent,
    teams: workload.teams || []
  };
};

module.exports = {
  serializeBatchReport,
  serializeTeacherWorkload
};
