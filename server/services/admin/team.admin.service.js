const mongoose = require('mongoose');
const Team = require('../../models/Team');
const User = require('../../models/User');
const Batch = require('../../models/Batch');
const StudentMilestoneScore = require('../../models/StudentMilestoneScore');
const GitHubMetricsCache = require('../../models/GitHubMetricsCache');
const AdminActionLog = require('../../models/AdminActionLog');
const { ROLES, TEAM_STATUS } = require('../../constants');

class TeamAdminService {
  async getAllTeams(filters = {}) {
    const query = {};
    if (filters.batchId) query.batchId = filters.batchId;
    if (filters.status) query.status = filters.status;
    if (filters.teacherId) query.assignedTeacherId = filters.teacherId;
    if (filters.unassigned === 'true' || filters.unassigned === true) {
      query.$or = [{ assignedTeacherId: null }, { assignedTeacherId: { $exists: false } }];
    }

    return await Team.find(query)
      .populate('members', 'name email githubUsername role')
      .populate('assignedTeacherId', 'name email')
      .populate('batchId', 'name minTeamSize maxTeamSize academicYear')
      .sort({ createdAt: -1 });
  }

  async assignTeacherToTeam(teamId, teacherId, adminId) {
    const teacher = await User.findOne({ _id: teacherId, role: ROLES.TEACHER });
    if (!teacher) throw new Error('Invalid teacher account.');

    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found.');

    const beforeSnap = team.toObject();
    team.assignedTeacherId = teacher._id;
    if (team.status === TEAM_STATUS.FORMING) {
      team.status = TEAM_STATUS.ACTIVE;
    }
    await team.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'team.assign_teacher',
      targetId: team._id,
      targetModel: 'Team',
      beforeSnapshot: beforeSnap,
      afterSnapshot: team.toObject(),
      details: `Assigned teacher ${teacher.name} to team '${team.name}'`
    });

    return team;
  }

  /**
   * Pair external evaluator to teacher cleanly unsetting old inverse pointers.
   */
  async pairExternalEvaluator(teacherId, externalId, adminId) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await this._executePairing({ teacherId, externalId, adminId, session });
      });
      return result;
    } catch (err) {
      if (err.message && err.message.includes('Transaction numbers are only allowed')) {
        return await this._executePairing({ teacherId, externalId, adminId, session: null });
      }
      throw err;
    } finally {
      session.endSession();
    }
  }

  async _executePairing({ teacherId, externalId, adminId, session }) {
    const opts = session ? { session } : {};

    const teacher = await User.findOne({ _id: teacherId, role: ROLES.TEACHER }).session(session);
    if (!teacher) throw new Error('Invalid internal teacher account.');

    const external = await User.findOne({ _id: externalId, role: ROLES.EXTERNAL }).session(session);
    if (!external) throw new Error('Invalid external evaluator account.');

    // 1. Unset old inverse pointer on any teacher currently linked to this external evaluator
    await User.updateMany(
      { linkedInternalEvaluator: external._id },
      { $unset: { linkedInternalEvaluator: '' } },
      opts
    );

    // 2. Unset old external evaluator linked to this teacher
    await User.updateMany(
      { linkedExternalTo: teacher._id },
      { $unset: { linkedExternalTo: '' } },
      opts
    );

    // 3. Set new 1:1 pointers
    external.linkedExternalTo = teacher._id;
    await external.save(opts);

    teacher.linkedInternalEvaluator = external._id;
    await teacher.save(opts);

    await AdminActionLog.create(
      [
        {
          actorId: adminId,
          action: 'evaluator.pair',
          targetId: external._id,
          targetModel: 'User',
          details: `Paired external evaluator ${external.name} with teacher ${teacher.name}`
        }
      ],
      opts
    );

    return { teacher, external };
  }

  /**
   * Manually dissolve a team and update downstream references.
   */
  async dissolveTeam(teamId, adminId) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await this._executeDissolve({ teamId, adminId, session });
      });
      return result;
    } catch (err) {
      if (err.message && err.message.includes('Transaction numbers are only allowed')) {
        return await this._executeDissolve({ teamId, adminId, session: null });
      }
      throw err;
    } finally {
      session.endSession();
    }
  }

  async _executeDissolve({ teamId, adminId, session }) {
    const opts = session ? { session } : {};

    const team = await Team.findById(teamId).session(session);
    if (!team) throw new Error('Team not found.');

    const memberIds = team.members || [];
    const beforeSnap = team.toObject();

    // Downstream reference update: Nullify teamId in studentmilestonescores & githubmetricscache for affected members
    if (memberIds.length > 0) {
      await StudentMilestoneScore.updateMany(
        { studentId: { $in: memberIds }, teamId: team._id },
        { $unset: { teamId: '' } },
        opts
      );

      await GitHubMetricsCache.updateMany(
        { studentId: { $in: memberIds }, teamId: team._id },
        { $unset: { teamId: '' } },
        opts
      );
    }

    await Team.findByIdAndDelete(teamId, opts);

    await AdminActionLog.create(
      [
        {
          actorId: adminId,
          action: 'team.dissolve',
          targetId: teamId,
          targetModel: 'Team',
          beforeSnapshot: beforeSnap,
          details: `Dissolved team '${team.name}' and updated downstream references for ${memberIds.length} members`
        }
      ],
      opts
    );

    return { dissolvedTeamId: teamId, affectedMemberCount: memberIds.length };
  }

  /**
   * Move a team member from one team to another and update downstream references.
   */
  async moveTeamMember(fromTeamId, toTeamId, studentId, adminId) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await this._executeMoveMember({ fromTeamId, toTeamId, studentId, adminId, session });
      });
      return result;
    } catch (err) {
      if (err.message && err.message.includes('Transaction numbers are only allowed')) {
        return await this._executeMoveMember({ fromTeamId, toTeamId, studentId, adminId, session: null });
      }
      throw err;
    } finally {
      session.endSession();
    }
  }

  async _executeMoveMember({ fromTeamId, toTeamId, studentId, adminId, session }) {
    const opts = session ? { session } : {};

    const fromTeam = await Team.findById(fromTeamId).session(session);
    if (!fromTeam) throw new Error('Source team not found.');

    const toTeam = await Team.findById(toTeamId).session(session);
    if (!toTeam) throw new Error('Target team not found.');

    const batch = await Batch.findById(toTeam.batchId).session(session);
    if (batch && toTeam.members.length >= batch.maxTeamSize) {
      throw new Error(`Target team '${toTeam.name}' has reached maximum size (${batch.maxTeamSize}).`);
    }

    // 1. Remove student from source team
    fromTeam.members = fromTeam.members.filter((m) => m.toString() !== studentId.toString());
    await fromTeam.save(opts);

    // 2. Add student to target team
    if (!toTeam.members.some((m) => m.toString() === studentId.toString())) {
      toTeam.members.push(studentId);
      await toTeam.save(opts);
    }

    // 3. Downstream reference update: Update teamId on studentmilestonescores & githubmetricscache
    await StudentMilestoneScore.updateMany(
      { studentId },
      { teamId: toTeam._id },
      opts
    );

    await GitHubMetricsCache.updateMany(
      { studentId },
      { teamId: toTeam._id },
      opts
    );

    await AdminActionLog.create(
      [
        {
          actorId: adminId,
          action: 'team.move_member',
          targetId: studentId,
          targetModel: 'User',
          details: `Moved student from team '${fromTeam.name}' to '${toTeam.name}' and updated downstream references`
        }
      ],
      opts
    );

    return { fromTeam, toTeam, studentId };
  }

  async overrideTeamStatus(teamId, status, adminId) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found.');

    if (![TEAM_STATUS.FORMING, TEAM_STATUS.ACTIVE, TEAM_STATUS.COMPLETED].includes(status)) {
      throw new Error('Invalid team status value.');
    }

    const beforeSnap = team.toObject();
    team.status = status;
    await team.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'team.override_status',
      targetId: team._id,
      targetModel: 'Team',
      beforeSnapshot: beforeSnap,
      afterSnapshot: team.toObject(),
      details: `Overrode team status to '${status}'`
    });

    return team;
  }
}

module.exports = new TeamAdminService();
