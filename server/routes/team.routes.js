const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const scopeTeam = require('../middleware/scopeTeam');
const { githubSyncRateLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../constants');

router.use(authenticate);

router.get('/', teamController.getTeams);
router.get('/:teamId', scopeTeam, teamController.getTeamById);
router.patch('/:teamId/assign-teacher', authorize([ROLES.ADMIN]), teamController.assignTeacher);
router.patch('/:teamId/repo', scopeTeam, teamController.updateRepoUrl);
router.get('/:teamId/metrics', scopeTeam, githubSyncRateLimiter, teamController.getTeamMetrics);

module.exports = router;
