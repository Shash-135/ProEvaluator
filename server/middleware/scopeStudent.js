const { ROLES } = require('../constants');
const Team = require('../models/Team');

const scopeStudent = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.body.studentId;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID parameter is required.' });
    }

    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (req.user.role === ROLES.STUDENT) {
      if (req.user._id.toString() !== studentId.toString()) {
        return res.status(403).json({ error: 'Forbidden. Students may only access their own records.' });
      }
      return next();
    }

    if (req.user.role === ROLES.TEACHER || req.user.role === ROLES.EXTERNAL) {
      const teacherId = req.user.role === ROLES.TEACHER ? req.user._id : req.user.linkedExternalTo;
      if (!teacherId) {
        return res.status(403).json({ error: 'External evaluator is not linked to an internal teacher.' });
      }
      // Check if student belongs to a team assigned to this teacher
      const team = await Team.findOne({ members: studentId, assignedTeacherId: teacherId });
      if (!team) {
        return res.status(403).json({ error: 'Not authorized for this student.' });
      }
      return next();
    }

    return res.status(403).json({ error: 'Unauthorized access.' });
  } catch (error) {
    return res.status(500).json({ error: 'Student scoping error: ' + error.message });
  }
};

module.exports = scopeStudent;
