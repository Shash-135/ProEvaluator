const express = require('express');
const router = express.Router();
const batchController = require('../../controllers/admin/batch.admin.controller');
const authorizeAction = require('../../middleware/authorizeAction');

router.get('/', authorizeAction('batch:read'), batchController.getBatches);
router.post('/', authorizeAction('batch:create'), batchController.createBatch);
router.patch('/:id', authorizeAction('batch:update'), batchController.updateBatch);
router.patch('/:id/sizing', authorizeAction('batch:update'), batchController.updateTeamSizing);
router.patch('/:id/archive', authorizeAction('batch:archive'), batchController.archiveBatch);

module.exports = router;
