const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestone.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const scopeStudent = require('../middleware/scopeStudent');
const scopeTeam = require('../middleware/scopeTeam');
const { ROLES } = require('../constants');

router.use(authenticate);

// Admin milestone template routes
router.post('/', authorize([ROLES.ADMIN]), milestoneController.createMilestone);
router.get('/', milestoneController.getMilestonesByBatch);

// Student scores & grading
router.get('/students/:studentId', scopeStudent, milestoneController.getStudentScores);
router.patch('/students/:studentId/:milestoneId', authorize([ROLES.TEACHER]), scopeStudent, milestoneController.gradeMilestone);

// Team-wide grading overview grid
router.get('/teams/:teamId/summary', scopeTeam, milestoneController.getTeamSummary);

module.exports = router;
