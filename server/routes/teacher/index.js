const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorizeAction = require('../../middleware/authorizeAction');
const scopeEvaluator = require('../../middleware/scopeEvaluator');
const { githubSyncRateLimiter } = require('../../middleware/rateLimiter');
const teacherService = require('../../services/evaluator/teacher.service');
const githubMetricsService = require('../../services/githubMetrics.service');
const { serializeTeam } = require('../../serializers/evaluator/team.serializer');
const { serializeStudentScores } = require('../../serializers/evaluator/score.serializer');

router.use(authenticate);
router.use(scopeEvaluator);

router.get('/teams', authorizeAction('team:view_own'), async (req, res, next) => {
  try {
    const teams = await teacherService.getAssignedTeams(req.user._id);
    res.json({ teams: teams.map(serializeTeam) });
  } catch (err) {
    next(err);
  }
});

router.get('/teams/:id', authorizeAction('team:view_own'), async (req, res, next) => {
  try {
    const { team, scores } = await teacherService.getTeamDetail(req.user._id, req.params.id);
    res.json({
      team: serializeTeam(team),
      students: scores.map(s => serializeStudentScores(s, 'teacher'))
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
    const force = req.query.force === 'true';
    const metrics = await githubMetricsService.getTeamMetrics(req.params.id, force);
    res.json({ metrics });
  } catch (err) {
    next(err);
  }
});

router.patch('/grade', authorizeAction('milestone:grade_own'), async (req, res, next) => {
  try {
    const { studentId, milestoneId, score, comments } = req.body;
    const result = await teacherService.gradeStudentMilestone({
      teacherId: req.user._id,
      studentId,
      milestoneId,
      score,
      comments
    });
    res.json(serializeStudentScores(result, 'teacher'));
  } catch (err) {
    if (err.message.includes('Access denied') || err.message.includes('must be between')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    next(err);
  }
});

router.get('/workload', authorizeAction('reports:view_own_workload'), async (req, res, next) => {
  try {
    const workload = await teacherService.getWorkloadSummary(req.user._id);
    res.json(workload);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
