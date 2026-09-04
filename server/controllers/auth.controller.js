const User = require('../models/User');
const bcrypt = require('bcryptjs');
const {
  generateAccessToken,
  generateRefreshToken,
  sendRefreshTokenCookie,
  clearRefreshTokenCookie,
  verifyRefreshToken
} = require('../utils/jwt');
const Cohort = require('../models/Cohort');
const crypto = require('crypto');
const emailService = require('../services/email.service');

exports.getPublicCohorts = async (req, res) => {
  try {
    const cohorts = await Cohort.find({ isActive: true }).select('name');
    return res.json({ cohorts });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch cohorts: ' + error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, githubUsername, cohortId } = req.body;

    if (role && role !== 'student') {
      return res.status(403).json({
        error: 'Public registration is strictly reserved for students. Teachers and External Evaluators must be added by an Administrator.'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'student', // Force student role for public signups
      githubUsername,
      cohortId,
      authProvider: 'local'
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    sendRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      message: 'Registration successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        githubUsername: user.githubUsername,
        cohortId: user.cohortId
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    sendRefreshTokenCookie(res, refreshToken);

    return res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        githubUsername: user.githubUsername,
        cohortId: user.cohortId
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token cookie missing.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Refresh token invalid or expired due to password reset.' });
    }

    const newAccessToken = generateAccessToken(user);
    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(500).json({ error: 'Token refresh failed: ' + error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('cohortId', 'name isActive')
      .populate('linkedExternalTo', 'name email')
      .populate('linkedInternalEvaluator', 'name email');
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user profile: ' + error.message });
  }
};

exports.logout = (req, res) => {
  clearRefreshTokenCookie(res);
  return res.json({ message: 'Logged out successfully.' });
};

exports.oauthCallback = async (req, res) => {
  try {
    const user = req.user;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    sendRefreshTokenCookie(res, refreshToken);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/auth/callback?token=${accessToken}`);
  } catch (error) {
    return res.status(500).json({ error: 'OAuth callback error: ' + error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Return 200 to prevent email enumeration
      return res.status(200).json({ message: 'If that email address is in our database, we will send you an email to reset your password.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetTokenHash = resetTokenHash;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    await emailService.sendPasswordResetEmail(user.email, resetToken);

    return res.status(200).json({ message: 'If that email address is in our database, we will send you an email to reset your password.' });
  } catch (error) {
    return res.status(500).json({ error: 'Forgot password failed: ' + error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetTokenHash,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetTokenHash = undefined;
    user.resetTokenExpiry = undefined;
    // Invalidate old sessions by incrementing tokenVersion
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Reset password failed: ' + error.message });
  }
};

exports.completeProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cohortId, githubUsername } = req.body;

    // Validate inputs
    if (!cohortId) {
      return res.status(400).json({ error: 'Cohort is required.' });
    }

    // Fetch the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Ensure user is a student
    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can complete their profile.' });
    }

    // Prevent changing cohort if already set
    if (user.cohortId) {
      return res.status(400).json({ error: 'You have already completed your profile and cannot change your cohort. Contact an administrator if you need assistance.' });
    }

    // Verify the cohort exists and is active
    const cohort = await Cohort.findById(cohortId);
    if (!cohort || !cohort.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive cohort.' });
    }

    // Update user profile
    user.cohortId = cohortId;
    if (githubUsername) {
      user.githubUsername = githubUsername.trim();
    }
    await user.save();

    // Fetch updated user with populated cohort
    const updatedUser = await User.findById(userId)
      .populate('cohortId', 'name isActive');

    return res.status(200).json({
      message: 'Profile completed successfully.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        githubUsername: updatedUser.githubUsername,
        cohortId: updatedUser.cohortId
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to complete profile: ' + error.message });
  }
};
