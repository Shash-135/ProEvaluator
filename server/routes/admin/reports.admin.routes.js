const express = require('express');
const router = express.Router();
const reportingController = require('../../controllers/admin/reporting.admin.controller');
const authorizeAction = require('../../middleware/authorizeAction');

router.get('/batch/:batchId', authorizeAction('reports:view'), reportingController.getBatchAnalytics);
router.get('/faculty-workload', authorizeAction('reports:view'), reportingController.getFacultyWorkload);

module.exports = router;
