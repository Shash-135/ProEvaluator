const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/admin/team.admin.controller');
const authorizeAction = require('../../middleware/authorizeAction');

router.get('/', authorizeAction('team:oversight'), teamController.getAllTeams);
router.post('/', authorizeAction('team:create'), teamController.createTeam);
router.patch('/:id', authorizeAction('team:update'), teamController.updateTeam);
router.post('/auto-form', authorizeAction('team:auto_form'), teamController.autoFormTeams);
router.post('/auto-assign-teachers', authorizeAction('team:auto_assign'), teamController.autoAssignTeachers);
router.patch('/:id/assign-teacher', authorizeAction('team:assign_teacher'), teamController.assignTeacher);
router.post('/pair-evaluator', authorizeAction('evaluator:pair'), teamController.pairExternalEvaluator);
router.delete('/:id/dissolve', authorizeAction('team:dissolve'), teamController.dissolveTeam);
router.delete('/:id', authorizeAction('team:dissolve'), teamController.dissolveTeam);
router.post('/move-member', authorizeAction('team:move_member'), teamController.moveTeamMember);
router.patch('/:id/status', authorizeAction('team:override_status'), teamController.overrideTeamStatus);

module.exports = router;
