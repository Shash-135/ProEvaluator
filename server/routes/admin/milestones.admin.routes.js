const express = require('express');
const router = express.Router();
const milestoneController = require('../../controllers/admin/milestone.admin.controller');
const authorizeAction = require('../../middleware/authorizeAction');

router.get('/', authorizeAction('milestone:read'), milestoneController.getMilestones);
router.post('/', authorizeAction('milestone:manage'), milestoneController.createMilestone);
router.patch('/:id', authorizeAction('milestone:manage'), milestoneController.updateMilestone);
router.delete('/:id', authorizeAction('milestone:manage'), milestoneController.deleteMilestone);
router.post('/reorder', authorizeAction('milestone:manage'), milestoneController.reorderMilestones);
router.post('/reconcile', authorizeAction('milestone:reconcile'), milestoneController.reconcileScores);

module.exports = router;
