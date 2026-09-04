const Team = require('../models/Team');
const User = require('../models/User');
const { ROLES } = require('../constants');

const scopeTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID parameter is required.' });
    }

    // Admin has universal access
    if (req.user.role === ROLES.ADMIN) {
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(440).json({ error: 'Team not found.' });
      }
      req.team = team;
      return next();
    }

    let targetTeacherId = null;

    if (req.user.role === ROLES.TEACHER) {
      targetTeacherId = req.user._id;
    } else if (req.user.role === ROLES.EXTERNAL) {
      if (!req.user.linkedExternalTo) {
        return res.status(403).json({ error: 'External evaluator is not linked to any internal teacher.' });
      }
      targetTeacherId = req.user.linkedExternalTo;
    } else if (req.user.role === ROLES.STUDENT) {
      // Student must be a member of the team
      const team = await Team.findOne({ _id: teamId, members: req.user._id });
      if (!team) {
        return res.status(403).json({ error: 'Access denied. You are not a member of this team.' });
      }
      req.team = team;
      return next();
    }

    if (!targetTeacherId) {
      return res.status(403).json({ error: 'Unauthorized role for team scoping.' });
    }

    // Query-level Mongoose filter enforcement (never fetch-then-filter-in-JS)
    const team = await Team.findOne({ _id: teamId, assignedTeacherId: targetTeacherId });

    if (!team) {
      return res.status(403).json({ error: 'Not authorized for this team.' });
    }

    req.team = team;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Team scoping error: ' + error.message });
  }
};

module.exports = scopeTeam;
