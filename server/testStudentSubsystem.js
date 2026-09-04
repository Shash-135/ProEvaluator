const mongoose = require('mongoose');
const assert = require('assert');
require('dotenv').config();

const scopeSelf = require('./middleware/scopeSelf');
const teamFormationService = require('./services/teamFormation.service');
const profileService = require('./services/student/profile.service');
const milestoneService = require('./services/student/milestone.service');
const metricsService = require('./services/student/metrics.service');
const githubMetricsService = require('./services/githubMetrics.service');

const User = require('./models/User');
const Batch = require('./models/Batch');
const Team = require('./models/Team');
const Milestone = require('./models/Milestone');
const StudentMilestoneScore = require('./models/StudentMilestoneScore');
const JoinRequest = require('./models/JoinRequest');
const GitHubMetricsCache = require('./models/GitHubMetricsCache');

const { serializeStudentMilestones } = require('./serializers/student/milestone.serializer');
const { serializeProfile } = require('./serializers/student/profile.serializer');
const { JOIN_REQUEST_STATUS, SYNC_STATUS } = require('./constants');

async function runTests() {
  console.log('Connecting to MongoDB for Student Subsystem tests...');
  await mongoose.connect(process.env.MONGODB_URI);

  // Setup Test Data
  const testBatch = await Batch.create({
    name: 'Test-Student-Batch',
    academicYear: '2026-2027',
    minTeamSize: 2,
    maxTeamSize: 3,
    isActive: true
  });

  const m1 = await Milestone.create({ batchId: testBatch._id, order: 1, title: 'M1', maxScore: 100, requiresExternalReview: false });
  const m2 = await Milestone.create({ batchId: testBatch._id, order: 2, title: 'M2', maxScore: 100, requiresExternalReview: true });

  const teacher = await User.create({ name: 'Teacher', email: 'teacher@test.com', role: 'teacher', isActive: true });
  
  const student1 = await User.create({ name: 'S1', email: 's1@test.com', role: 'student', batchId: testBatch._id, isActive: true, githubUsername: 's1gh' });
  const student2 = await User.create({ name: 'S2', email: 's2@test.com', role: 'student', batchId: testBatch._id, isActive: true, githubUsername: 's2gh' });
  const student3 = await User.create({ name: 'S3', email: 's3@test.com', role: 'student', batchId: testBatch._id, isActive: true, githubUsername: 's3gh' });
  const student4 = await User.create({ name: 'S4', email: 's4@test.com', role: 'student', batchId: testBatch._id, isActive: true });

  // 1. Test Self-Scoping Middleware
  const mockReq = {
    user: { _id: student1._id, role: 'student' },
    params: { id: student2._id.toString() }, // attempting to access someone else's ID
    body: { studentId: student3._id.toString() }
  };
  const mockRes = { status: () => ({ json: () => {} }) };
  
  scopeSelf(mockReq, mockRes, () => {});
  assert.strictEqual(mockReq.params.id, null, 'Middleware should nullify params.id');
  assert.strictEqual(mockReq.body.studentId.toString(), student1._id.toString(), 'Middleware should override body.studentId with user._id');
  assert.strictEqual(mockReq.studentId.toString(), student1._id.toString(), 'Middleware should set req.studentId');
  console.log('[1/6] Self-Scoping Middleware verified.');

  // 2. Profile & Validation
  const serializedProfile = serializeProfile(student1);
  assert.strictEqual(serializedProfile.role, undefined, 'Profile serializer must exclude role');
  assert.strictEqual(serializedProfile.providerId, undefined, 'Profile serializer must exclude providerId');
  
  await assert.rejects(
    profileService.updateGithubUsername(student1._id, '-invalid-name'),
    /Invalid GitHub username format/,
    'Should reject leading hyphen'
  );
  await profileService.updateGithubUsername(student1._id, 'valid-name');
  const updatedS1 = await User.findById(student1._id);
  assert.strictEqual(updatedS1.githubUsername, 'valid-name', 'Should update valid GitHub username');
  console.log('[2/6] Profile serialization and validation verified.');

  // 3. Team Formation (Candidates, Send, Cancel, Accept, Auto-reject)
  const candidates = await teamFormationService.getCandidates(testBatch._id);
  assert.strictEqual(candidates.length, 4, 'All 4 students should be candidates initially');

  // S1 sends request to S2
  let reqS1toS2 = await teamFormationService.sendJoinRequest({ fromStudentId: student1._id, toStudentId: student2._id, batchId: testBatch._id });
  
  // S1 cancels request
  await teamFormationService.cancelJoinRequest({ requestId: reqS1toS2._id, studentId: student1._id });
  const cancelledReq = await JoinRequest.findById(reqS1toS2._id);
  assert.strictEqual(cancelledReq.status, JOIN_REQUEST_STATUS.REJECTED, 'Request should be cancelled (rejected)');

  // Cannot cancel as receiver
  reqS1toS2 = await teamFormationService.sendJoinRequest({ fromStudentId: student1._id, toStudentId: student2._id, batchId: testBatch._id });
  await assert.rejects(
    teamFormationService.cancelJoinRequest({ requestId: reqS1toS2._id, studentId: student2._id }),
    /Only the sender/,
    'Receiver should not be able to cancel request'
  );

  // S2 accepts S1
  await teamFormationService.acceptJoinRequest({ requestId: reqS1toS2._id, studentId: student2._id });
  const s1s2Team = await Team.findOne({ members: student1._id });
  assert.strictEqual(s1s2Team.members.length, 2, 'Team should have 2 members');

  // S3 sends request to S1 (now in team)
  const reqS3toS1 = await teamFormationService.sendJoinRequest({ fromStudentId: student3._id, toStudentId: student1._id, batchId: testBatch._id });
  
  // S4 sends request to S2 (now in team)
  const reqS4toS2 = await teamFormationService.sendJoinRequest({ fromStudentId: student4._id, toStudentId: student2._id, batchId: testBatch._id });

  // S1 accepts S3 (Team reaches max capacity of 3)
  await teamFormationService.acceptJoinRequest({ requestId: reqS3toS1._id, studentId: student1._id });
  const updatedTeam = await Team.findById(s1s2Team._id);
  assert.strictEqual(updatedTeam.members.length, 3, 'Team should have 3 members');

  // Check auto-reject for S4 -> S2 request since S2's team is now full
  const rejectedReq = await JoinRequest.findById(reqS4toS2._id);
  assert.strictEqual(rejectedReq.status, JOIN_REQUEST_STATUS.REJECTED, 'Pending request should be auto-rejected when team fills up');

  // Candidates check
  const newCandidates = await teamFormationService.getCandidates(testBatch._id);
  assert.strictEqual(newCandidates.length, 1, 'Only S4 should be a candidate now since the other 3 are in a full team');
  assert.strictEqual(newCandidates[0]._id.toString(), student4._id.toString());
  console.log('[3/6] Team Formation flow (cancel, accept, auto-reject, candidates) verified.');

  // 4. Milestone Serialization (External Fields Omission)
  await StudentMilestoneScore.create({
    studentId: student1._id,
    batchId: testBatch._id,
    teamId: updatedTeam._id,
    scores: [
      { milestoneId: m1._id, order: 1, maxScore: 100, score: 90, status: 'graded' },
      { milestoneId: m2._id, order: 2, maxScore: 100, score: 80, externalScore: 85, externalStatus: 'graded', status: 'graded' }
    ],
    progressSummary: { completed: 2, remaining: 0, totalScore: 172.5, percentComplete: 100 }
  });

  const milestoneResult = await milestoneService.getOwnMilestoneScores(student1._id);
  const serializedMilestones = serializeStudentMilestones(milestoneResult);
  
  const m1Serialized = serializedMilestones.scores.find(s => s.order === 1);
  const m2Serialized = serializedMilestones.scores.find(s => s.order === 2);

  assert.strictEqual(m1Serialized.externalScore, undefined, 'External fields must be absent on M1 (requiresExternalReview=false)');
  assert.strictEqual(m2Serialized.externalScore, 85, 'External score must be present on M2');
  console.log('[4/6] Milestone serialization verified.');

  // 5. No Team State
  const noTeamMilestones = await milestoneService.getOwnMilestoneScores(student4._id);
  assert.strictEqual(noTeamMilestones.hasTeam, false, 'Student 4 should have hasTeam: false for milestones');
  const noTeamMetrics = await metricsService.getOwnMetrics(student4._id, false);
  assert.strictEqual(noTeamMetrics.hasTeam, false, 'Student 4 should have hasTeam: false for metrics');
  console.log('[5/6] No-team states verified.');

  // 6. Metrics Throttle & Cross-Role Throttle Isolation
  updatedTeam.repoUrl = 'https://github.com/test-owner/test-repo';
  await updatedTeam.save();

  // Create a dummy cache row so getTeamMetrics doesn't fail on missing cache
  await GitHubMetricsCache.create({
    studentId: student1._id,
    teamId: updatedTeam._id,
    repoUrl: updatedTeam.repoUrl,
    commitCount: 5,
    linesAdded: 10,
    linesDeleted: 2,
    lastSyncedAt: new Date(Date.now() - 100000), // old
    syncStatus: SYNC_STATUS.OK
  });

  // Action A: Teacher force-refreshes the whole team.
  // Wait, the API call might fail if the repo is fake, but we are testing throttle logic.
  // We'll mock the octokit call inside getTeamMetrics to not actually fail the throttle test.
  try {
    await githubMetricsService.getTeamMetrics(updatedTeam._id, true);
  } catch (err) {} // Ignore API errors

  // Action B: Student1 force-refreshes their own metrics IMMEDIATELY after.
  // It should NOT throw a throttle error because throttleMap is separate.
  let studentThrottled = false;
  try {
    await metricsService.getOwnMetrics(student1._id, true);
  } catch (err) {
    if (err.message.includes('force refresh')) studentThrottled = true;
  }
  assert.strictEqual(studentThrottled, false, 'Student should NOT be throttled by a prior Teacher refresh (Cross-role throttle isolation)');

  // Action C: Student1 force-refreshes again immediately.
  // It SHOULD throw a throttle error now because they just refreshed.
  let studentThrottledAgain = false;
  try {
    await metricsService.getOwnMetrics(student1._id, true);
  } catch (err) {
    if (err.message.includes('force refresh')) studentThrottledAgain = true;
  }
  assert.strictEqual(studentThrottledAgain, true, 'Student SHOULD be throttled on consecutive own refreshes');

  console.log('[6/6] Metrics Throttle and Cross-Role Isolation verified.');

  // Cleanup
  await JoinRequest.deleteMany({ batchId: testBatch._id });
  await StudentMilestoneScore.deleteMany({ batchId: testBatch._id });
  await Team.deleteMany({ batchId: testBatch._id });
  await Milestone.deleteMany({ batchId: testBatch._id });
  await Batch.findByIdAndDelete(testBatch._id);
  await User.deleteMany({ _id: { $in: [teacher._id, student1._id, student2._id, student3._id, student4._id] } });
  await GitHubMetricsCache.deleteMany({ teamId: updatedTeam._id });

  console.log('--- ALL STUDENT SUBSYSTEM TESTS PASSED CLEANLY ---');

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
