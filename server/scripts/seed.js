const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Batch = require('../models/Batch');
const Team = require('../models/Team');
const Milestone = require('../models/Milestone');
const StudentMilestoneScore = require('../models/StudentMilestoneScore');
const GitHubMetricsCache = require('../models/GitHubMetricsCache');
const { ROLES, TEAM_STATUS, MILESTONE_STATUS, SYNC_STATUS } = require('../constants');

const seedData = async () => {
  const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pro_evaluator';
  console.log(`[Seed] Connecting to database: ${connUri}...`);
  await mongoose.connect(connUri);

  console.log('[Seed] Clearing existing collections...');
  await User.deleteMany({});
  await Batch.deleteMany({});
  await Team.deleteMany({});
  await Milestone.deleteMany({});
  await StudentMilestoneScore.deleteMany({});
  await GitHubMetricsCache.deleteMany({});

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Create Batch
  console.log('[Seed] Creating Batch...');
  const batch = await Batch.create({
    name: '2026-CSE-FinalYear',
    minTeamSize: 2,
    maxTeamSize: 4,
    academicYear: '2025-2026',
    isActive: true
  });

  // 2. Create Milestones (1-8)
  console.log('[Seed] Creating 8 Milestone templates...');
  const milestoneTitles = [
    'Milestone 1: Project Proposal & Scope',
    'Milestone 2: System Design & SRS',
    'Milestone 3: Architecture & Schema Specification',
    'Milestone 4: Core Feature MVP Prototype',
    'Milestone 5: Integration & GitHub Tracking',
    'Milestone 6: User Testing & Refinement',
    'Milestone 7: Final Report & Code Freeze',
    'Milestone 8: Final Project Defense'
  ];

  const milestones = [];
  for (let i = 0; i < milestoneTitles.length; i++) {
    const m = await Milestone.create({
      batchId: batch._id,
      order: i + 1,
      title: milestoneTitles[i],
      maxScore: 100,
      rubric: `Evaluate adherence to standard engineering principles for ${milestoneTitles[i]}.`,
      dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000)
    });
    milestones.push(m);
  }

  // 3. Create Users
  console.log('[Seed] Creating Users...');
  const admin = await User.create({
    name: 'Admin Director',
    email: 'admin@college.edu',
    password: defaultPassword,
    role: ROLES.ADMIN,
    authProvider: 'local'
  });

  const teacher1 = await User.create({
    name: 'Dr. Alan Smith',
    email: 'prof.smith@college.edu',
    password: defaultPassword,
    role: ROLES.TEACHER,
    batchId: batch._id,
    authProvider: 'local'
  });

  const teacher2 = await User.create({
    name: 'Prof. Sarah Johnson',
    email: 'prof.johnson@college.edu',
    password: defaultPassword,
    role: ROLES.TEACHER,
    batchId: batch._id,
    authProvider: 'local'
  });

  const externalEval = await User.create({
    name: 'Industry Lead Evaluator',
    email: 'external.eval@industry.com',
    password: defaultPassword,
    role: ROLES.EXTERNAL,
    linkedExternalTo: teacher1._id,
    authProvider: 'local'
  });

  teacher1.linkedInternalEvaluator = externalEval._id;
  await teacher1.save();

  // Create Students
  const studentData = [
    { name: 'Linus Torvalds', email: 'linus@student.edu', gh: 'torvalds' },
    { name: 'Dan Abramov', email: 'dan@student.edu', gh: 'gaearon' },
    { name: 'Evan You', email: 'evan@student.edu', gh: 'yyx99' },
    { name: 'Siddharth Kshetrapal', email: 'siddharth@student.edu', gh: 'siddharthkp' },
    { name: 'Shadcn Developer', email: 'shadcn@student.edu', gh: 'shadcn' },
    { name: 'Rich Harris', email: 'rich@student.edu', gh: 'rich-harris' }
  ];

  const students = [];
  for (const s of studentData) {
    const st = await User.create({
      name: s.name,
      email: s.email,
      password: defaultPassword,
      role: ROLES.STUDENT,
      githubUsername: s.gh,
      batchId: batch._id,
      authProvider: 'local'
    });
    students.push(st);
  }

  // 4. Create Teams
  console.log('[Seed] Creating Teams...');
  const team1 = await Team.create({
    batchId: batch._id,
    name: 'Team Alpha - React Engine',
    members: [students[0]._id, students[1]._id, students[2]._id],
    assignedTeacherId: teacher1._id,
    status: TEAM_STATUS.ACTIVE,
    repoUrl: 'https://github.com/facebook/react'
  });

  const team2 = await Team.create({
    batchId: batch._id,
    name: 'Team Beta - Vue Engine',
    members: [students[3]._id, students[4]._id, students[5]._id],
    assignedTeacherId: teacher2._id,
    status: TEAM_STATUS.ACTIVE,
    repoUrl: 'https://github.com/vuejs/core'
  });

  // 5. Create Milestone Scores for Students
  console.log('[Seed] Creating Student Milestone Scores...');
  for (let idx = 0; idx < students.length; idx++) {
    const student = students[idx];
    const team = idx < 3 ? team1 : team2;
    const teacher = idx < 3 ? teacher1 : teacher2;

    const scoresArray = milestones.map((m, i) => {
      const isGraded = i < 3; // First 3 milestones graded
      const score = isGraded ? 85 + Math.floor(Math.random() * 12) : 0;
      return {
        milestoneId: m._id,
        order: m.order,
        score,
        maxScore: m.maxScore,
        status: isGraded ? MILESTONE_STATUS.GRADED : MILESTONE_STATUS.PENDING,
        gradedBy: isGraded ? teacher._id : null,
        comments: isGraded ? `Great execution on ${m.title}` : '',
        gradedAt: isGraded ? new Date() : null
      };
    });

    const completed = 3;
    const remaining = 5;
    const totalScore = scoresArray.reduce((acc, s) => acc + s.score, 0);

    await StudentMilestoneScore.create({
      studentId: student._id,
      teamId: team._id,
      batchId: batch._id,
      scores: scoresArray,
      progressSummary: {
        completed,
        remaining,
        totalScore,
        percentComplete: Math.round((completed / 8) * 100)
      }
    });

    // 6. Create GitHub metrics cache
    await GitHubMetricsCache.create({
      studentId: student._id,
      teamId: team._id,
      repoUrl: team.repoUrl,
      commitCount: 45 + Math.floor(Math.random() * 30),
      linesAdded: 1200 + Math.floor(Math.random() * 800),
      linesDeleted: 300 + Math.floor(Math.random() * 200),
      lastCommitAt: new Date(),
      lastSyncedAt: new Date(),
      syncStatus: SYNC_STATUS.OK
    });
  }

  console.log('=====================================================');
  console.log('[Seed] Database seeded successfully!');
  console.log('Sample Accounts (Password: password123):');
  console.log('  Admin:       admin@college.edu');
  console.log('  Teacher 1:   prof.smith@college.edu');
  console.log('  Teacher 2:   prof.johnson@college.edu');
  console.log('  External:    external.eval@industry.com');
  console.log('  Student 1:   linus@student.edu');
  console.log('  Student 2:   dan@student.edu');
  console.log('=====================================================');

  await mongoose.disconnect();
  process.exit(0);
};

seedData().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
