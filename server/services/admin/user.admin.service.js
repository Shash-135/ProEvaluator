const User = require('../../models/User');
const Team = require('../../models/Team');
const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const GitHubMetricsCache = require('../../models/GitHubMetricsCache');
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

  async updateUser(userId, data, adminId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found.');

    const beforeSnap = user.toObject();

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.email !== undefined) user.email = data.email.toLowerCase().trim();
    if (data.role !== undefined) {
      if (![ROLES.ADMIN, ROLES.TEACHER, ROLES.EXTERNAL, ROLES.STUDENT].includes(data.role)) {
        throw new Error('Invalid user role.');
      }
      user.role = data.role;
    }
    if (data.cohortId !== undefined) {
      user.cohortId = data.cohortId || null;
    }
    if (data.githubUsername !== undefined) {
      user.githubUsername = data.githubUsername ? data.githubUsername.trim() : '';
    }
    if (data.isActive !== undefined) {
      if (user._id.toString() === adminId.toString() && !data.isActive) {
        throw new Error('You cannot deactivate your own admin account.');
      }
      user.isActive = data.isActive;
    }

    await user.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'user.update',
      targetId: user._id,
      targetModel: 'User',
      beforeSnapshot: beforeSnap,
      afterSnapshot: user.toObject(),
      details: `Updated user profile for ${user.email}`
    });

    return user;
  }

  async deleteUser(userId, adminId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found.');

    if (user._id.toString() === adminId.toString()) {
      throw new Error('You cannot delete your own admin account.');
    }

    const beforeSnap = user.toObject();

    // 1. Remove from any teams as member
    await Team.updateMany(
      { members: user._id },
      { $pull: { members: user._id } }
    );

    // 2. Unset evaluator pointers
    await User.updateMany(
      { linkedExternalTo: user._id },
      { $unset: { linkedExternalTo: '' } }
    );
    await User.updateMany(
      { linkedInternalEvaluator: user._id },
      { $unset: { linkedInternalEvaluator: '' } }
    );

    // 3. Unset teacher assignments on teams
    await Team.updateMany(
      { assignedTeacherId: user._id },
      { $unset: { assignedTeacherId: '' } }
    );

    // 4. Clean up scores and metrics
    await StudentMilestoneScore.deleteMany({ studentId: user._id });
    await GitHubMetricsCache.deleteMany({ studentId: user._id });

    // 5. Delete user
    await User.findByIdAndDelete(userId);

    await AdminActionLog.create({
      actorId: adminId,
      action: 'user.delete',
      targetId: userId,
      targetModel: 'User',
      beforeSnapshot: beforeSnap,
      details: `Permanently deleted user '${user.name}' (${user.email}) and cleaned up relations`
    });

    return { deletedUserId: userId, name: user.name, email: user.email };
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
