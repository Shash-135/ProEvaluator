const express = require('express');
const router = express.Router();
const userAdminController = require('../../controllers/admin/user.admin.controller');
const userController = require('../../controllers/user.controller');
const authorizeAction = require('../../middleware/authorizeAction');

router.get('/', authorizeAction('user:manage'), userAdminController.getUsers);
router.post('/', authorizeAction('user:manage'), userController.createUserByAdmin);
router.patch('/:id/role', authorizeAction('user:promote'), userAdminController.changeRole);
router.patch('/:id/promote-admin', authorizeAction('user:promote'), userController.promoteTeacherToAdmin);
router.patch('/:id/active', authorizeAction('user:soft_delete'), userAdminController.toggleActiveStatus);
router.patch('/:id/github', authorizeAction('user:update_github'), userAdminController.updateGithubUsername);

module.exports = router;
