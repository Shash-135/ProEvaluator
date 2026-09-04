const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorizeAction = require('../../middleware/authorizeAction');
const scopeEvaluator = require('../../middleware/scopeEvaluator');
const { githubSyncRateLimiter } = require('../../middleware/rateLimiter');
const externalService = require('../../services/evaluator/external.service');
const githubMetricsService = require('../../services/githubMetrics.service');
const { serializeTeam } = require('../../serializers/evaluator/team.serializer');
const { serializeStudentScores } = require('../../serializers/evaluator/score.serializer');

router.use(authenticate);
router.use(scopeEvaluator);

router.get('/teams', authorizeAction('team:view_own'), async (req, res, next) => {
  try {
    const teams = await externalService.getLinkedTeams(req.user);
    res.json({ teams: teams.map(serializeTeam) });
  } catch (err) {
    next(err);
  }
});

router.get('/teams/:id', authorizeAction('team:view_own'), async (req, res, next) => {
  try {
    const { team, scores } = await externalService.getTeamDetail(req.user, req.params.id);
    res.json({
      team: serializeTeam(team),
      students: scores.map(s => serializeStudentScores(s, 'external'))
    });
  } catch (err) {
    if (err.message.includes('Access denied')) {
      return res.status(403).json({ message: err.message });
    }
    next(err);
  }
});

router.get('/teams/:id/metrics', authorizeAction('metrics:view_own'), githubSyncRateLimiter, async (req, res, next) => {
  try {
    // External evaluators can view metrics but not force refresh
    const force = false;
    const metrics = await githubMetricsService.getTeamMetrics(req.params.id, force);
    res.json({ metrics });
  } catch (err) {
    next(err);
  }
});

router.patch('/grade', authorizeAction('milestone:grade_external'), async (req, res, next) => {
  try {
    const { studentId, milestoneId, score, comments } = req.body;
    const result = await externalService.gradeExternalMilestone({
      externalUser: req.user,
      studentId,
      milestoneId,
      score,
      comments
    });
    res.json(serializeStudentScores(result, 'external'));
  } catch (err) {
    if (err.message.includes('Access denied') || err.message.includes('must be between') || err.message.includes('does not require external review')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    next(err);
  }
});

module.exports = router;
