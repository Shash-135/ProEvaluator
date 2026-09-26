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

  async createTeam(data, adminId) {
    const { batchId, name, memberIds = [], assignedTeacherId = null } = data;
    const batch = await Batch.findById(batchId);
    if (!batch) throw new Error('Batch not found.');

    const team = await Team.create({
      batchId,
      name,
      members: memberIds,
      assignedTeacherId: assignedTeacherId || undefined,
      status: memberIds.length >= batch.minTeamSize ? TEAM_STATUS.ACTIVE : TEAM_STATUS.FORMING
    });

    await AdminActionLog.create({
      actorId: adminId,
      action: 'team.create',
      targetId: team._id,
      targetModel: 'Team',
      afterSnapshot: team.toObject(),
      details: `Admin created team '${team.name}'`
    });

    return team;
  }

  async updateTeam(teamId, data, adminId) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found.');

    const beforeSnap = team.toObject();
    if (data.name !== undefined) team.name = data.name;
    if (data.repoUrl !== undefined) team.repoUrl = data.repoUrl;
    if (data.status !== undefined) team.status = data.status;
    if (data.assignedTeacherId !== undefined) {
      team.assignedTeacherId = data.assignedTeacherId || null;
    }
    if (Array.isArray(data.memberIds)) {
      team.members = data.memberIds;
    }

    await team.save();

    await AdminActionLog.create({
      actorId: adminId,
      action: 'team.update',
      targetId: team._id,
      targetModel: 'Team',
      beforeSnapshot: beforeSnap,
      afterSnapshot: team.toObject(),
      details: `Admin updated team '${team.name}'`
    });

    return team;
  }

  async autoFormTeams({ batchId, minTeamSize, maxTeamSize, prefix = 'Team' }, adminId) {
    const batch = await Batch.findById(batchId);
    if (!batch) throw new Error('Batch not found.');

    const minSize = Number(minTeamSize) || batch.minTeamSize || 2;
    const maxSize = Number(maxTeamSize) || batch.maxTeamSize || 4;

    if (minSize > maxSize) {
      throw new Error(`Minimum team size (${minSize}) cannot exceed maximum team size (${maxSize}).`);
    }

    // 1. Fetch all active students in the batch's cohort
    const allStudents = await User.find({
      cohortId: batch.cohortId,
      role: ROLES.STUDENT,
      isActive: true
    }).select('name email githubUsername');

    // 2. Fetch all existing teams in this batch
    const existingTeams = await Team.find({ batchId });
    const assignedStudentIds = new Set();
    existingTeams.forEach(t => {
      (t.members || []).forEach(m => assignedStudentIds.add(m.toString()));
    });

    // 3. Filter remaining students
    const remainingStudents = allStudents.filter(s => !assignedStudentIds.has(s._id.toString()));

    if (remainingStudents.length === 0) {
      return {
        message: 'All students in this cohort are already assigned to teams in this semester.',
        createdTeams: [],
        remainingCount: 0
      };
    }

    // 4. Randomize remaining students (Fisher-Yates shuffle)
    const shuffled = [...remainingStudents];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const total = shuffled.length;
    let partitions = [];

    // Determine how many teams (K) to form:
    // Try to find K such that minSize <= floor(total / K) and ceil(total / K) <= maxSize.
    let bestK = null;
    const minK = Math.ceil(total / maxSize);
    const maxK = Math.floor(total / minSize);

    if (minK <= maxK && minK > 0) {
      bestK = minK;
    }

    if (bestK && bestK > 0) {
      const base = Math.floor(total / bestK);
      const rem = total % bestK;
      let currentIndex = 0;
      for (let k = 0; k < bestK; k++) {
        const teamSize = k < rem ? base + 1 : base;
        const group = shuffled.slice(currentIndex, currentIndex + teamSize);
        currentIndex += teamSize;
        partitions.push(group);
      }
    } else {
      // If total < minSize or non-perfect partition, partition into groups
      let currentIndex = 0;
      while (currentIndex < total) {
        const remainingToGroup = total - currentIndex;
        if (remainingToGroup < minSize && partitions.length > 0) {
          let pIdx = 0;
          while (currentIndex < total) {
            partitions[pIdx % partitions.length].push(shuffled[currentIndex++]);
            pIdx++;
          }
          break;
        }

        const take = Math.min(maxSize, remainingToGroup);
        partitions.push(shuffled.slice(currentIndex, currentIndex + take));
        currentIndex += take;
      }
    }

    // 5. Create teams in database
    const createdTeams = [];
    let teamCounter = existingTeams.length + 1;

    for (const group of partitions) {
      const teamName = `${prefix} ${teamCounter++}`;
      const memberIds = group.map(s => s._id);

      const newTeam = await Team.create({
        batchId: batch._id,
        name: teamName,
        members: memberIds,
        status: memberIds.length >= minSize ? TEAM_STATUS.ACTIVE : TEAM_STATUS.FORMING
      });

      createdTeams.push(newTeam);
    }

    // 6. Admin audit log
    await AdminActionLog.create({
      actorId: adminId,
      action: 'team.auto_form',
      targetId: batch._id,
      targetModel: 'Batch',
      details: `Auto-formed ${createdTeams.length} random teams from ${total} remaining students in '${batch.name}'`
    });

    return {
      message: `Successfully formed ${createdTeams.length} teams from ${total} remaining students.`,
      createdTeams,
      remainingCount: total
    };
  }

  async autoAssignTeachers({ batchId, onlyUnassigned = false }, adminId) {
    const batch = await Batch.findById(batchId);
    if (!batch) throw new Error('Batch not found.');

    const teachers = await User.find({ role: ROLES.TEACHER, isActive: true });
    if (teachers.length === 0) {
      throw new Error('No active teachers found in the system to assign teams to.');
    }

    let query = { batchId };
    if (onlyUnassigned === true || onlyUnassigned === 'true') {
      query.$or = [{ assignedTeacherId: null }, { assignedTeacherId: { $exists: false } }];
    }

    const teams = await Team.find(query);
    if (teams.length === 0) {
      return {
        message: 'No eligible teams found in this batch to assign.',
        assignedCount: 0,
        teacherCount: teachers.length,
        distribution: []
      };
    }

    // Shuffle teachers and teams using Fisher-Yates for fair randomness
    const shuffledTeachers = [...teachers];
    for (let i = shuffledTeachers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeachers[i], shuffledTeachers[j]] = [shuffledTeachers[j], shuffledTeachers[i]];
    }

    const shuffledTeams = [...teams];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    // Round-robin equal distribution
    const assignmentsByTeacher = {};
    shuffledTeachers.forEach(t => {
      assignmentsByTeacher[t._id.toString()] = {
        teacher: { id: t._id, name: t.name, email: t.email },
        teams: []
      };
    });

    for (let i = 0; i < shuffledTeams.length; i++) {
      const teacher = shuffledTeachers[i % shuffledTeachers.length];
      const team = shuffledTeams[i];
      team.assignedTeacherId = teacher._id;
      if (team.status === TEAM_STATUS.FORMING) {
        team.status = TEAM_STATUS.ACTIVE;
      }
      await team.save();

      assignmentsByTeacher[teacher._id.toString()].teams.push({
        id: team._id,
        name: team.name
      });
    }

    await AdminActionLog.create({
      actorId: adminId,
      action: 'team.auto_assign_teachers',
      targetId: batch._id,
      targetModel: 'Batch',
      details: `Randomly and equally assigned ${teams.length} teams across ${teachers.length} available teachers in '${batch.name}'`
    });

    return {
      message: `Successfully assigned ${teams.length} teams across ${teachers.length} teachers.`,
      assignedCount: teams.length,
      teacherCount: teachers.length,
      distribution: Object.values(assignmentsByTeacher)
    };
  }
}

module.exports = new TeamAdminService();
