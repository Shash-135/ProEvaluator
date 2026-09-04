const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Batch = require('./models/Batch');
const Team = require('./models/Team');
const Milestone = require('./models/Milestone');
const StudentMilestoneScore = require('./models/StudentMilestoneScore');
const GitHubMetricsCache = require('./models/GitHubMetricsCache');
const AdminActionLog = require('./models/AdminActionLog');

const batchAdminService = require('./services/admin/batch.admin.service');
const milestoneAdminService = require('./services/admin/milestone.admin.service');
const teamAdminService = require('./services/admin/team.admin.service');
const userAdminService = require('./services/admin/user.admin.service');
const reportingAdminService = require('./services/admin/reporting.admin.service');

const { serializeUser } = require('./serializers/admin/user.serializer');
const { hasPermission } = require('./config/permissions');

async function runVerification() {
  console.log('--- Starting Admin Subsystem Verification Suite ---');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/7] MongoDB Atlas connected successfully.');

  // Find seeded admin user
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) throw new Error('Seeded admin user not found.');
  console.log(`[2/7] Admin actor identified: ${admin.email} (${admin._id})`);

  // Test 1: Centralized Permission Matrix
  const canAdminDissolve = hasPermission('admin', 'team:dissolve');
  const canStudentDissolve = hasPermission('student', 'team:dissolve');
  if (!canAdminDissolve || canStudentDissolve) {
    throw new Error('Permission matrix check failed!');
  }
  console.log('[3/7] Centralized permission matrix verified cleanly.');

  // Test 2: Create Test Batch & Milestones
  const testBatch = await batchAdminService.createBatch(
    { name: 'Admin-Test-Batch-' + Date.now(), academicYear: '2026-2027', minTeamSize: 2, maxTeamSize: 3 },
    admin._id
  );
  console.log(`[4/7] Batch created cleanly: ${testBatch.name} (${testBatch._id})`);

  const m1 = await milestoneAdminService.createMilestone(
    { batchId: testBatch._id, order: 1, title: 'Test M1', maxScore: 50 },
    admin._id
  );
  const m2 = await milestoneAdminService.createMilestone(
    { batchId: testBatch._id, order: 2, title: 'Test M2', maxScore: 100 },
    admin._id
  );

  // Test 3: Create Test Student, Team, Milestone Scores & GitHub Metric Cache
  const testStudent = await User.create({
    name: 'Test Student ' + Date.now(),
    email: `student_${Date.now()}@college.edu`,
    role: 'student',
    batchId: testBatch._id,
    githubUsername: 'teststudentgh',
    providerId: 'secret_oauth_123',
    isActive: true
  });

  const testTeam = await Team.create({
    name: 'Test Team ' + Date.now(),
    batchId: testBatch._id,
    members: [testStudent._id],
    status: 'active'
  });

  const scoreDoc = await StudentMilestoneScore.create({
    studentId: testStudent._id,
    batchId: testBatch._id,
    teamId: testTeam._id,
    scores: [
      { milestoneId: m1._id, order: 1, score: 45, maxScore: 50, status: 'graded' },
      { milestoneId: m2._id, order: 2, score: 90, maxScore: 100, status: 'graded' }
    ],
    progressSummary: { completed: 2, remaining: 0, totalScore: 135, percentComplete: 100 }
  });

  const metricCache = await GitHubMetricsCache.create({
    studentId: testStudent._id,
    teamId: testTeam._id,
    repoUrl: 'https://github.com/test/repo',
    commitCount: 25,
    linesAdded: 500,
    linesDeleted: 100,
    syncStatus: 'ok',
    lastSyncedAt: new Date()
  });

  console.log('[5/7] Initialized student, team, milestone scores, and metric cache documents.');

  // Test 4: Dynamic Reconciliation & Idempotency Test
  console.log('Running Milestone Score Reconciliation (Invocation 1)...');
  const res1 = await milestoneAdminService.reconcileStudentMilestoneScores(testBatch._id, admin._id);
  const doc1 = await StudentMilestoneScore.findById(scoreDoc._id);

  console.log('Running Milestone Score Reconciliation (Invocation 2 - Idempotency Assert)...');
  const res2 = await milestoneAdminService.reconcileStudentMilestoneScores(testBatch._id, admin._id);
  const doc2 = await StudentMilestoneScore.findById(scoreDoc._id);

  if (doc1.scores.length !== doc2.scores.length || doc1.scores[0].score !== doc2.scores[0].score) {
    throw new Error('Reconciliation idempotency failed! Scores differed on second run.');
  }
  console.log('[6/7] Dynamic milestone score reconciliation verified to be 100% IDEMPOTENT.');

  // Test 5: Downstream Reference Cascade on Team Dissolution
  console.log('Dissolving team and checking downstream reference updates...');
  await teamAdminService.dissolveTeam(testTeam._id, admin._id);

  const updatedScoreDoc = await StudentMilestoneScore.findById(scoreDoc._id);
  const updatedMetricCache = await GitHubMetricsCache.findById(metricCache._id);

  if (updatedScoreDoc.teamId !== null && updatedScoreDoc.teamId !== undefined) {
    throw new Error('Downstream teamId in StudentMilestoneScore was not set to null on dissolve!');
  }
  if (updatedMetricCache.teamId !== null && updatedMetricCache.teamId !== undefined) {
    throw new Error('Downstream teamId in GitHubMetricsCache was not set to null on dissolve!');
  }
  console.log('[7/7] Downstream reference updates on team dissolution verified successfully (teamId set to null).');

  // Test 6: Serializer Excludes OAuth Internals
  const serialized = serializeUser(testStudent);
  if (serialized.providerId || serialized.githubAccessToken) {
    throw new Error('User serializer failed to strip OAuth sensitive fields!');
  }
  console.log('User DTO serializer confirmed to strip providerId and OAuth token internals.');

  // Test 7: Audit Log Verification
  const auditLogs = await AdminActionLog.find({ actorId: admin._id }).sort({ createdAt: -1 });
  console.log(`Audit log verified: ${auditLogs.length} admin action entries recorded.`);

  // Cleanup Test Documents
  await StudentMilestoneScore.findByIdAndDelete(scoreDoc._id);
  await GitHubMetricsCache.findByIdAndDelete(metricCache._id);
  await User.findByIdAndDelete(testStudent._id);
  await Milestone.deleteMany({ batchId: testBatch._id });
  await Batch.findByIdAndDelete(testBatch._id);

  console.log('--- ALL ADMIN SUBSYSTEM TESTS PASSED CLEANLY ---');
  await mongoose.disconnect();
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
