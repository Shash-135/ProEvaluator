const express = require('express');
const router = express.Router();
const joinRequestController = require('../controllers/joinRequest.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../constants');

router.use(authenticate);
router.use(authorize([ROLES.STUDENT]));

router.post('/', joinRequestController.sendRequest);
router.get('/', joinRequestController.getMyRequests);
router.patch('/:id/accept', joinRequestController.acceptRequest);
router.patch('/:id/reject', joinRequestController.rejectRequest);

module.exports = router;
