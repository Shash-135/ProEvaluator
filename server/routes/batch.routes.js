const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../constants');

router.use(authenticate);

router.post('/', authorize([ROLES.ADMIN]), batchController.createBatch);
router.get('/', batchController.getBatches);
router.get('/:id', batchController.getBatchById);
router.patch('/:id/active', authorize([ROLES.ADMIN]), batchController.setActiveBatch);
router.get('/:id/roster', authorize([ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT]), batchController.getBatchRoster);

module.exports = router;
