const User = require('../../models/User');
const AdminActionLog = require('../../models/AdminActionLog');
const { ROLES } = require('../../constants');

class UserAdminService {
  async getUsers(filters = {}) {
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.cohortId) query.cohortId = filters.cohortId;
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [{ name: regex }, { email: regex }, { githubUsername: regex }];
    }

    return await User.find(query)
      .select('-password')
      .populate('cohortId', 'name')
      .populate('linkedExternalTo', 'name email')
      .populate('linkedInternalEvaluator', 'name email')
      .sort({ role: 1, name: 1 });
  }

  async changeUserRole(userId, newRole, adminId) {
    if (![ROLES.ADMIN, ROLES.TEACHER, ROLES.EXTERNAL, ROLES.STUDENT].includes(newRole)) {
      throw new Error('Invalid user role.');
    }

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found.');

    const beforeSnap = user.toObject();
    user.role = newRole;
    await user.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'user.change_role',
      targetId: user._id,
      targetModel: 'User',
      beforeSnapshot: beforeSnap,
      afterSnapshot: user.toObject(),
      details: `Changed role for user ${user.email} from ${beforeSnap.role} to ${newRole}`
    });

    return user;
  }

  async toggleUserActiveStatus(userId, isActive, adminId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found.');

    if (user._id.toString() === adminId.toString()) {
      throw new Error('You cannot deactivate your own admin account.');
    }

    const beforeSnap = user.toObject();
    user.isActive = isActive;
    await user.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: isActive ? 'user.reactivate' : 'user.deactivate',
      targetId: user._id,
      targetModel: 'User',
      beforeSnapshot: beforeSnap,
      afterSnapshot: user.toObject(),
      details: `${isActive ? 'Reactivated' : 'Deactivated (soft-delete)'} user account ${user.email}`
    });

    return user;
  }

  async updateStudentGithubUsername(studentId, githubUsername, adminId) {
    const user = await User.findById(studentId);
    if (!user) throw new Error('User not found.');

    const beforeSnap = user.toObject();
    user.githubUsername = githubUsername ? githubUsername.trim() : '';
    await user.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'user.update_github',
      targetId: user._id,
      targetModel: 'User',
      beforeSnapshot: beforeSnap,
      afterSnapshot: user.toObject(),
      details: `Updated GitHub username for ${user.email} to '@${user.githubUsername}'`
    });

    return user;
  }
}

module.exports = new UserAdminService();
