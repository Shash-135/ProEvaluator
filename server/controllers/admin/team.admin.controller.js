const teamAdminService = require('../../services/admin/team.admin.service');
const { serializeTeam, serializeTeams } = require('../../serializers/admin/team.serializer');

exports.getAllTeams = async (req, res) => {
  try {
    const teams = await teamAdminService.getAllTeams(req.query);
    return res.json({ teams: serializeTeams(teams) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.assignTeacher = async (req, res) => {
  try {
    const { teacherId } = req.body;
    const team = await teamAdminService.assignTeacherToTeam(req.params.id, teacherId, req.user._id);
    return res.json({ message: 'Teacher assigned to team', team: serializeTeam(team) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.pairExternalEvaluator = async (req, res) => {
  try {
    const { teacherId, externalId } = req.body;
    const result = await teamAdminService.pairExternalEvaluator(teacherId, externalId, req.user._id);
    return res.json({ message: 'External evaluator paired cleanly with internal teacher', result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.dissolveTeam = async (req, res) => {
  try {
    const result = await teamAdminService.dissolveTeam(req.params.id, req.user._id);
    return res.json({ message: 'Team dissolved and downstream references updated cleanly', result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.moveTeamMember = async (req, res) => {
  try {
    const { fromTeamId, toTeamId, studentId } = req.body;
    const result = await teamAdminService.moveTeamMember(fromTeamId, toTeamId, studentId, req.user._id);
    return res.json({ message: 'Student moved to new team and downstream references updated', result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.overrideTeamStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const team = await teamAdminService.overrideTeamStatus(req.params.id, status, req.user._id);
    return res.json({ message: 'Team status updated', team: serializeTeam(team) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
