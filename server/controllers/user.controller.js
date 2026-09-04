const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../constants');

/**
 * Admin provisioning endpoint to create Teacher, External Evaluator, or Admin accounts.
 */
exports.createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, role, batchId, githubUsername, linkedExternalTo } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    if (![ROLES.TEACHER, ROLES.EXTERNAL, ROLES.ADMIN, ROLES.STUDENT].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role specified.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // If role is external evaluator, validate linked teacher
    let linkedTeacherId = null;
    if (role === ROLES.EXTERNAL) {
      if (!linkedExternalTo) {
        return res.status(400).json({ error: 'External Evaluators must be linked to an internal Teacher (linkedExternalTo).' });
      }
      const teacher = await User.findOne({ _id: linkedExternalTo, role: ROLES.TEACHER });
      if (!teacher) {
        return res.status(400).json({ error: 'Specified internal teacher ID is invalid or does not have Teacher role.' });
      }
      linkedTeacherId = teacher._id;
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      batchId: batchId || undefined,
      githubUsername: githubUsername || undefined,
      linkedExternalTo: linkedTeacherId,
      authProvider: 'local'
    });

    // If external evaluator created, update inverse pointer on linked teacher
    if (role === ROLES.EXTERNAL && linkedTeacherId) {
      await User.findByIdAndUpdate(linkedTeacherId, { linkedInternalEvaluator: user._id });
    }

    return res.status(201).json({
      message: `Account created successfully for ${user.name} (${user.role})`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        batchId: user.batchId,
        linkedExternalTo: user.linkedExternalTo
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create user account: ' + error.message });
  }
};

/**
 * Promote an existing Teacher account to Admin role
 */
exports.promoteTeacherToAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role !== ROLES.TEACHER && user.role !== ROLES.ADMIN) {
      return res.status(400).json({ error: 'Only Teacher accounts can be promoted to Admin role.' });
    }

    user.role = ROLES.ADMIN;
    await user.save();

    return res.json({
      message: `Successfully promoted ${user.name} to Administrator.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to promote user to Admin: ' + error.message });
  }
};

/**
 * List all system users with optional role filtering
 */
exports.getUsers = async (req, res) => {
  try {
    const { role, batchId } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (batchId) filter.batchId = batchId;

    const users = await User.find(filter)
      .select('-password')
      .populate('batchId', 'name academicYear')
      .populate('linkedExternalTo', 'name email')
      .sort({ role: 1, name: 1 });

    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
  }
};

/**
 * Delete a user account
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(440).json({ error: 'User not found.' });

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    await User.findByIdAndDelete(userId);
    return res.json({ message: 'User account removed successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete user: ' + error.message });
  }
};
