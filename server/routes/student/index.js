const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorizeAction = require('../../middleware/authorizeAction');
const scopeSelf = require('../../middleware/scopeSelf');

const profileService = require('../../services/student/profile.service');
const milestoneService = require('../../services/student/milestone.service');
const metricsService = require('../../services/student/metrics.service');
const teamFormationService = require('../../services/teamFormation.service');
const Team = require('../../models/Team');

const { serializeProfile } = require('../../serializers/student/profile.serializer');
const { serializeTeam } = require('../../serializers/student/team.serializer');
const { serializeStudentMilestones } = require('../../serializers/student/milestone.serializer');

router.use(authenticate);
router.use(scopeSelf); // Enforces self-scoping

// Profile endpoints
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.studentId);
    res.json(serializeProfile(profile));
  } catch (err) {
    next(err);
  }
});

router.patch('/profile/github', authorizeAction('profile:update_self'), async (req, res, next) => {
  try {
    const { githubUsername } = req.body;
    const profile = await profileService.updateGithubUsername(req.studentId, githubUsername);
    res.json(serializeProfile(profile));
  } catch (err) {
    next(err);
  }
});

// Team Formation endpoints
router.get('/team', authorizeAction('team:read_own'), async (req, res, next) => {
  try {
    const team = await Team.findOne({ members: req.studentId }).populate('members', 'name githubUsername');
    if (!team) {
      return res.json({ hasTeam: false });
    }
    res.json({ hasTeam: true, team: serializeTeam(team) });
  } catch (err) {
    next(err);
  }
});

router.get('/team/candidates', authorizeAction('team:read_own'), async (req, res, next) => {
  try {
    const candidates = await teamFormationService.getCandidates(req.user.batchId);
    res.json(candidates.map(c => ({
      _id: c._id,
      name: c.name,
      email: c.email,
      githubUsername: c.githubUsername
    })));
  } catch (err) {
    next(err);
  }
});

router.get('/team/join-requests', authorizeAction('team:read_own'), async (req, res, next) => {
  try {
    const requests = await teamFormationService.getJoinRequests(req.studentId);
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

router.post('/team/join-requests', authorizeAction('join_request:send'), async (req, res, next) => {
  try {
    const { toStudentId } = req.body;
    const request = await teamFormationService.sendJoinRequest({
      fromStudentId: req.studentId,
      toStudentId,
      batchId: req.user.batchId
    });
    res.json(request);
  } catch (err) {
    next(err);
  }
});

router.post('/team/join-requests/:id/accept', authorizeAction('join_request:respond'), async (req, res, next) => {
  try {
    const result = await teamFormationService.acceptJoinRequest({
      requestId: req.params.id,
      studentId: req.studentId
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/team/join-requests/:id/reject', authorizeAction('join_request:respond'), async (req, res, next) => {
  try {
    const result = await teamFormationService.rejectJoinRequest({
      requestId: req.params.id,
      studentId: req.studentId
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/team/join-requests/:id/cancel', authorizeAction('join_request:send'), async (req, res, next) => {
  try {
    const result = await teamFormationService.cancelJoinRequest({
      requestId: req.params.id,
      studentId: req.studentId
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Milestone endpoints
router.get('/milestones', authorizeAction('milestone:view_self'), async (req, res, next) => {
  try {
    const result = await milestoneService.getOwnMilestoneScores(req.studentId);
    if (!result.hasTeam) {
      return res.json({ hasTeam: false, scores: [], progressSummary: null });
    }
    res.json(serializeStudentMilestones(result));
  } catch (err) {
    next(err);
  }
});

// Metrics endpoints
router.get('/metrics', authorizeAction('metrics:view_self'), async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    if (force) {
      // Verify refresh permission if force=true
      const { hasPermission } = require('../../config/permissions');
      if (!hasPermission(req.user.role, 'metrics:refresh_self')) {
        return res.status(403).json({ error: 'Access denied: metrics:refresh_self' });
      }
    }

    const result = await metricsService.getOwnMetrics(req.studentId, force);
    if (result.hasTeam === false) {
      return res.json({ hasTeam: false, metrics: null });
    }
    res.json({ hasTeam: true, metrics: result });
  } catch (err) {
    if (err.message.includes('throttle') || err.message.includes('force refresh metrics')) {
      return res.status(429).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
