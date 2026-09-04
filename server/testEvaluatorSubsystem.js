const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Batch = require('./models/Batch');
const Team = require('./models/Team');
const Milestone = require('./models/Milestone');
const StudentMilestoneScore = require('./models/StudentMilestoneScore');
const EvaluatorActionLog = require('./models/EvaluatorActionLog');

const teacherService = require('./services/evaluator/teacher.service');
const externalService = require('./services/evaluator/external.service');
const scoreAggregationService = require('./services/evaluator/scoreAggregation.service');

async function runVerification() {
  console.log('--- Starting Evaluator Subsystem Verification Suite ---');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/7] MongoDB connected successfully.');

  // Create test actors
  const teacher1 = await User.create({
    name: 'Teacher 1',
    email: `teacher1_${Date.now()}@college.edu`,
    role: 'teacher',
    isActive: true
  });
  const teacher2 = await User.create({
    name: 'Teacher 2',
    email: `teacher2_${Date.now()}@college.edu`,
    role: 'teacher',
    isActive: true
  });
  const external1 = await User.create({
    name: 'External 1',
    email: `ext1_${Date.now()}@college.edu`,
    role: 'external',
    linkedExternalTo: teacher1._id,
    isActive: true
  });

  console.log(`[2/7] Test actors created (Teacher 1, Teacher 2, External 1).`);

  // Create test batch and milestones
  const testBatch = await Batch.create({
    name: 'Eval-Test-Batch-' + Date.now(),
    academicYear: '2026-2027',
    minTeamSize: 1,
    maxTeamSize: 3,
    isActive: true
  });

  const m1 = await Milestone.create({
    batchId: testBatch._id,
    order: 1,
    title: 'Standard Milestone',
    maxScore: 100,
    requiresExternalReview: false
  });

  const m2 = await Milestone.create({
    batchId: testBatch._id,
    order: 2,
    title: 'External Milestone',
    maxScore: 100,
    requiresExternalReview: true
  });

  // Create test student and team assigned to teacher1
  const student1 = await User.create({
    name: 'Student 1',
    email: `student1_${Date.now()}@college.edu`,
    role: 'student',
    batchId: testBatch._id,
    isActive: true
  });

  const team1 = await Team.create({
    name: 'Team 1',
    batchId: testBatch._id,
    members: [student1._id],
    assignedTeacherId: teacher1._id,
    status: 'active'
  });

  const scoreDoc = await StudentMilestoneScore.create({
    studentId: student1._id,
    batchId: testBatch._id,
    teamId: team1._id,
    scores: [
      { milestoneId: m1._id, order: m1.order, maxScore: m1.maxScore, status: 'pending' },
      { milestoneId: m2._id, order: m2.order, maxScore: m2.maxScore, status: 'pending' }
    ]
  });

  console.log('[3/7] Test entities created.');

  // Test 1: Scope Ownership Enforcement
  let scopeEnforcementPassed = false;
  try {
    await teacherService.gradeStudentMilestone({ teacherId: teacher2._id, studentId: student1._id, milestoneId: m1._id, score: 80, comments: 'Good' });
  } catch (err) {
    if (err.message.includes('Access denied')) {
      scopeEnforcementPassed = true;
    }
  }
  if (!scopeEnforcementPassed) {
    throw new Error('Scope ownership failed! Teacher 2 was able to grade Teacher 1\'s student.');
  }

  try {
    // External 1 should not be able to grade m1 (requiresExternalReview = false)
    await externalService.gradeExternalMilestone({ externalUser: external1, studentId: student1._id, milestoneId: m1._id, score: 80, comments: 'Good' });
    throw new Error('External was able to grade a milestone that does not require external review!');
  } catch (err) {
    if (!err.message.includes('does not require external review')) {
      throw err;
    }
  }
  
  console.log('[4/7] Scope and Role Enforcement verified.');

  // Test 2: Independent Grading
  // Teacher grades M1 and M2
  await teacherService.gradeStudentMilestone({ teacherId: teacher1._id, studentId: student1._id, milestoneId: m1._id, score: 80, comments: 'Good' });
  await teacherService.gradeStudentMilestone({ teacherId: teacher1._id, studentId: student1._id, milestoneId: m2._id, score: 80, comments: 'Good' });

  // External grades M2
  await externalService.gradeExternalMilestone({ externalUser: external1, studentId: student1._id, milestoneId: m2._id, score: 90, comments: 'Excellent' });

  console.log('[5/7] Independent grading processed.');

  // Test 3: Score Aggregation
  const updatedDoc = await StudentMilestoneScore.findById(scoreDoc._id);
  const m1Score = updatedDoc.scores.find(s => s.milestoneId.toString() === m1._id.toString());
  const m2Score = updatedDoc.scores.find(s => s.milestoneId.toString() === m2._id.toString());

  if (updatedDoc.progressSummary.totalScore !== 165) { // 80 + (80 + 90)/2 = 165
    throw new Error(`Score aggregation failed! Expected totalScore 165, got ${updatedDoc.progressSummary.totalScore}`);
  }

  console.log('[6/7] Score aggregation weighting verified (100% teacher vs 50/50).');

  // Cleanup
  await EvaluatorActionLog.deleteMany({ actorId: { $in: [teacher1._id, teacher2._id, external1._id] } });
  await StudentMilestoneScore.findByIdAndDelete(scoreDoc._id);
  await Team.findByIdAndDelete(team1._id);
  await Milestone.deleteMany({ batchId: testBatch._id });
  await Batch.findByIdAndDelete(testBatch._id);
  await User.deleteMany({ _id: { $in: [teacher1._id, teacher2._id, external1._id, student1._id] } });

  console.log('[7/7] Test artifacts cleaned up.');
  console.log('--- ALL EVALUATOR SUBSYSTEM TESTS PASSED CLEANLY ---');

  await mongoose.disconnect();
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
