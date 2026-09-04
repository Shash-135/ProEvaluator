const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/admin/team.admin.controller');
const authorizeAction = require('../../middleware/authorizeAction');

router.get('/', authorizeAction('team:oversight'), teamController.getAllTeams);
router.patch('/:id/assign-teacher', authorizeAction('team:assign_teacher'), teamController.assignTeacher);
router.post('/pair-evaluator', authorizeAction('evaluator:pair'), teamController.pairExternalEvaluator);
router.delete('/:id/dissolve', authorizeAction('team:dissolve'), teamController.dissolveTeam);
router.post('/move-member', authorizeAction('team:move_member'), teamController.moveTeamMember);
router.patch('/:id/status', authorizeAction('team:override_status'), teamController.overrideTeamStatus);

module.exports = router;
