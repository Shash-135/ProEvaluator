const express = require('express');
const router = express.Router();
const cohortController = require('../../controllers/admin/cohort.admin.controller');
const authorizeAction = require('../../middleware/authorizeAction');

router.get('/', authorizeAction('cohort:read'), cohortController.getCohorts);
router.post('/', authorizeAction('cohort:create'), cohortController.createCohort);
router.patch('/:id', authorizeAction('cohort:update'), cohortController.updateCohort);
router.delete('/:id', authorizeAction('cohort:delete'), cohortController.deleteCohort);

module.exports = router;
