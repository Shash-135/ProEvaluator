const Team = require('../models/Team');
const User = require('../models/User');
const githubMetricsService = require('../services/githubMetrics.service');
const { ROLES, TEAM_STATUS } = require('../constants');

exports.getTeams = async (req, res) => {
  try {
    const { batchId } = req.query;
    const filter = {};
    if (batchId) filter.batchId = batchId;

    if (req.user.role === ROLES.TEACHER) {
      filter.assignedTeacherId = req.user._id;
    } else if (req.user.role === ROLES.EXTERNAL) {
      if (!req.user.linkedExternalTo) {
        return res.json({ teams: [] });
      }
      filter.assignedTeacherId = req.user.linkedExternalTo;
    } else if (req.user.role === ROLES.STUDENT) {
      filter.members = req.user._id;
    }

    const teams = await Team.find(filter)
      .populate('members', 'name email githubUsername')
      .populate('assignedTeacherId', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ teams });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch teams: ' + error.message });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.team._id)
      .populate('members', 'name email githubUsername role')
      .populate('assignedTeacherId', 'name email')
      .populate('batchId', 'name minTeamSize maxTeamSize');
    return res.json({ team });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch team: ' + error.message });
  }
};

exports.assignTeacher = async (req, res) => {
  try {
    const { teacherId } = req.body;
    const { teamId } = req.params;

    const teacher = await User.findOne({ _id: teacherId, role: ROLES.TEACHER });
    if (!teacher) {
      return res.status(400).json({ error: 'Invalid teacher ID.' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(440).json({ error: 'Team not found.' });

    team.assignedTeacherId = teacher._id;
    team.status = TEAM_STATUS.ACTIVE;
    await team.save();

    return res.json({ message: 'Teacher assigned successfully', team });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to assign teacher: ' + error.message });
  }
};

exports.updateRepoUrl = async (req, res) => {
  try {
    const { repoUrl } = req.body;
    const team = req.team;

    team.repoUrl = repoUrl;
    await team.save();

    return res.json({ message: 'Repository URL updated successfully', team });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update repository URL: ' + error.message });
  }
};

exports.getTeamMetrics = async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const metrics = await githubMetricsService.getTeamMetrics(req.team._id, force);
    return res.json({ metrics });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to sync GitHub metrics: ' + error.message });
  }
};
