const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Cohort = require('./models/Cohort');
const Batch = require('./models/Batch');
const Team = require('./models/Team');
const Milestone = require('./models/Milestone');
const StudentMilestoneScore = require('./models/StudentMilestoneScore');
const AdminActionLog = require('./models/AdminActionLog');
const EvaluatorActionLog = require('./models/EvaluatorActionLog');
const GitHubMetricsCache = require('./models/GitHubMetricsCache');

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  console.log('Truncating database...');
  await User.deleteMany({});
  await Cohort.deleteMany({});
  await Batch.deleteMany({});
  await Team.deleteMany({});
  await Milestone.deleteMany({});
  await StudentMilestoneScore.deleteMany({});
  await AdminActionLog.deleteMany({});
  await EvaluatorActionLog.deleteMany({});
  await GitHubMetricsCache.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  console.log('Creating Admin...');
  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@college.edu',
    password: passwordHash,
    role: 'admin',
    isActive: true
  });

  console.log('Creating Teachers...');
  const teacher1 = await User.create({
    name: 'Prof. Alan Smith',
    email: 'teacher1@college.edu',
    password: passwordHash,
    role: 'teacher',
    isActive: true
  });
  const teacher2 = await User.create({
    name: 'Dr. Jane Doe',
    email: 'teacher2@college.edu',
    password: passwordHash,
    role: 'teacher',
    isActive: true
  });

  console.log('Creating External Evaluators...');
  const external1 = await User.create({
    name: 'Mr. Mark Johnson (Industry Expert)',
    email: 'external1@college.edu',
    password: passwordHash,
    role: 'external',
    linkedExternalTo: teacher1._id,
    isActive: true
  });
  const external2 = await User.create({
    name: 'Ms. Sarah Williams (Senior Dev)',
    email: 'external2@college.edu',
    password: passwordHash,
    role: 'external',
    linkedExternalTo: teacher2._id,
    isActive: true
  });

  console.log('Creating Cohort...');
  const cohort = await Cohort.create({
    name: '2025-2027',
    createdBy: admin._id,
    isActive: true
  });

  console.log('Creating Semesters (Batches)...');
  const batch1 = await Batch.create({
    name: 'Semester 1',
    cohortId: cohort._id,
    minTeamSize: 2,
    maxTeamSize: 4,
    isActive: true
  });
  const batch2 = await Batch.create({
    name: 'Semester 2',
    cohortId: cohort._id,
    minTeamSize: 2,
    maxTeamSize: 4,
    isActive: true
  });

  console.log('Creating Milestones...');
  const m1 = await Milestone.create({ batchId: batch1._id, order: 1, title: 'Project Proposal', maxScore: 50, requiresExternalReview: false, rubric: 'Clear objectives, feasibility, and scope.' });
  const m2 = await Milestone.create({ batchId: batch1._id, order: 2, title: 'System Design Review', maxScore: 100, requiresExternalReview: true, rubric: 'Architecture diagrams, DB schema, API specs.' });
  const m3 = await Milestone.create({ batchId: batch1._id, order: 3, title: 'Mid-term Demo', maxScore: 100, requiresExternalReview: false, rubric: 'Core features working, progress vs timeline.' });
  const m4 = await Milestone.create({ batchId: batch1._id, order: 4, title: 'Final Code & Report', maxScore: 200, requiresExternalReview: true, rubric: 'Complete product, tests, code quality, final report.' });

  console.log('Creating Students...');
  const students = [];
  for (let i = 1; i <= 6; i++) {
    students.push(await User.create({
      name: `Student ${i}`,
      email: `student${i}@college.edu`,
      password: passwordHash,
      role: 'student',
      cohortId: cohort._id,
      isActive: true,
      githubUsername: `student${i}gh`
    }));
  }

  // Deactivated student for testing
  await User.create({
    name: 'Deactivated Student',
    email: 'deactivated@college.edu',
    password: passwordHash,
    role: 'student',
    cohortId: cohort._id,
    isActive: false
  });

  console.log('Creating Teams (For Semester 1)...');
  const team1 = await Team.create({ name: 'Alpha Coders', batchId: batch1._id, members: [students[0]._id, students[1]._id], assignedTeacherId: teacher1._id, status: 'active' });
  const team2 = await Team.create({ name: 'Beta Builders', batchId: batch1._id, members: [students[2]._id, students[3]._id], assignedTeacherId: teacher1._id, status: 'active' });
  const team3 = await Team.create({ name: 'Gamma Innovators', batchId: batch1._id, members: [students[4]._id, students[5]._id], assignedTeacherId: teacher2._id, status: 'active' });

  console.log('Creating Milestone Scores...');
  // Helper to create scores for a student
  const createScores = async (student, team, teacherScore1, extScore2, teacherScore2) => {
    const scoresArray = [
      { milestoneId: m1._id, order: 1, maxScore: 50, score: teacherScore1, status: 'graded', gradedBy: team.assignedTeacherId },
      { milestoneId: m2._id, order: 2, maxScore: 100, score: teacherScore2, status: 'graded', gradedBy: team.assignedTeacherId, externalScore: extScore2, externalStatus: extScore2 ? 'graded' : 'pending' },
      { milestoneId: m3._id, order: 3, maxScore: 100, status: 'pending' },
      { milestoneId: m4._id, order: 4, maxScore: 200, status: 'pending' }
    ];
    
    // Aggregation will be handled properly if we just call the service or manually simulate it. 
    // We'll manually simulate the aggregation for seed data simplicity.
    let totalScore = teacherScore1;
    if (extScore2) totalScore += (teacherScore2 + extScore2) / 2;
    
    await StudentMilestoneScore.create({
      studentId: student._id,
      batchId: batch1._id,
      teamId: team._id,
      scores: scoresArray,
      progressSummary: { completed: extScore2 ? 2 : 1, remaining: extScore2 ? 2 : 3, totalScore, percentComplete: extScore2 ? 50 : 25 }
    });
  };

  await createScores(students[0], team1, 45, 88, 90);
  await createScores(students[1], team1, 42, 85, 85);
  await createScores(students[2], team2, 48, null, 95); // M2 not graded externally yet
  await createScores(students[3], team2, 50, null, 98);
  await createScores(students[4], team3, 35, 75, 80);
  await createScores(students[5], team3, 38, 78, 82);

  console.log('Database seeded successfully!');
  console.log('====================================');
  console.log('Test Accounts (Password for all: password123)');
  console.log('Admin: admin@college.edu');
  console.log('Teacher 1: teacher1@college.edu (Has 2 teams)');
  console.log('Teacher 2: teacher2@college.edu (Has 1 team)');
  console.log('External 1: external1@college.edu (Linked to Teacher 1)');
  console.log('External 2: external2@college.edu (Linked to Teacher 2)');
  console.log('Student 1: student1@college.edu (Team 1)');
  console.log('====================================');
  
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(console.error);
