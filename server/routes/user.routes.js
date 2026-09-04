const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../constants');

router.use(authenticate);
router.use(authorize([ROLES.ADMIN]));

router.post('/', userController.createUserByAdmin);
router.get('/', userController.getUsers);
router.patch('/:userId/promote-admin', userController.promoteTeacherToAdmin);
router.delete('/:userId', userController.deleteUser);

module.exports = router;
