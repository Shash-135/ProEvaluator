const userAdminService = require('../../services/admin/user.admin.service');
const { serializeUser, serializeUsers } = require('../../serializers/admin/user.serializer');

exports.getUsers = async (req, res) => {
  try {
    const users = await userAdminService.getUsers(req.query);
    return res.json({ users: serializeUsers(users) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await userAdminService.changeUserRole(req.params.id, role, req.user._id);
    return res.json({ message: 'User role updated', user: serializeUser(user) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.toggleActiveStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await userAdminService.toggleUserActiveStatus(req.params.id, isActive, req.user._id);
    return res.json({ message: `User account ${isActive ? 'reactivated' : 'deactivated (soft-delete)'}`, user: serializeUser(user) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.updateGithubUsername = async (req, res) => {
  try {
    const { githubUsername } = req.body;
    const user = await userAdminService.updateStudentGithubUsername(req.params.id, githubUsername, req.user._id);
    return res.json({ message: 'GitHub username updated', user: serializeUser(user) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
