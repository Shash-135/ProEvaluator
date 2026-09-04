const express = require('express');
const router = express.Router();
const logsController = require('../../controllers/admin/logs.admin.controller');
const authorizeAction = require('../../middleware/authorizeAction');

router.get('/', authorizeAction('logs:view'), logsController.getAuditLogs);

module.exports = router;
