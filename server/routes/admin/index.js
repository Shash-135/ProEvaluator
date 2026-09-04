const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { ROLES } = require('../../constants');

const cohortAdminRoutes = require('./cohorts.admin.routes');
const batchAdminRoutes = require('./batches.admin.routes');
const milestoneAdminRoutes = require('./milestones.admin.routes');
const teamAdminRoutes = require('./teams.admin.routes');
const userAdminRoutes = require('./users.admin.routes');
const reportAdminRoutes = require('./reports.admin.routes');
const logAdminRoutes = require('./logs.admin.routes');

// All /api/admin/* endpoints require authentication & Admin role
router.use(authenticate);
router.use(authorize([ROLES.ADMIN]));

router.use('/cohorts', cohortAdminRoutes);
router.use('/batches', batchAdminRoutes);
router.use('/milestones', milestoneAdminRoutes);
router.use('/teams', teamAdminRoutes);
router.use('/users', userAdminRoutes);
router.use('/reports', reportAdminRoutes);
router.use('/logs', logAdminRoutes);

module.exports = router;
