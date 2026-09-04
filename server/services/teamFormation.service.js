const mongoose = require('mongoose');
const Team = require('../models/Team');
const JoinRequest = require('../models/JoinRequest');
const Batch = require('../models/Batch');
const User = require('../models/User');
const { JOIN_REQUEST_STATUS, TEAM_STATUS } = require('../constants');

class TeamFormationService {
  /**
   * Send a join request from one student to another
   */
  async sendJoinRequest({ fromStudentId, toStudentId, batchId }) {
    if (fromStudentId.toString() === toStudentId.toString()) {
      throw new Error('You cannot send a join request to yourself.');
    }

    const batch = await Batch.findById(batchId);
    if (!batch) throw new Error('Invalid batch ID.');

    // Check existing team size for sender
    const existingTeam = await Team.findOne({ members: fromStudentId, batchId });
    if (existingTeam && existingTeam.members.length >= batch.maxTeamSize) {
      throw new Error(`Your team has already reached the maximum size of ${batch.maxTeamSize}.`);
    }

    // Check if recipient is already in a full team
    const recipientTeam = await Team.findOne({ members: toStudentId, batchId });
    if (recipientTeam && recipientTeam.members.length >= batch.maxTeamSize) {
      throw new Error(`Target student's team is already full (${batch.maxTeamSize} members).`);
    }

    // Check for existing pending request between these two
    const existingReq = await JoinRequest.findOne({
      fromStudent: fromStudentId,
      toStudent: toStudentId,
      batchId,
      status: JOIN_REQUEST_STATUS.PENDING
    });
    if (existingReq) {
      throw new Error('A pending join request already exists for this student.');
    }

    const request = await JoinRequest.create({
      batchId,
      fromStudent: fromStudentId,
      toStudent: toStudentId,
      status: JOIN_REQUEST_STATUS.PENDING
    });

    return request;
  }

  /**
   * Accept a join request (wrapped in transaction if supported)
   */
  async acceptJoinRequest({ requestId, studentId }) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await this._executeAccept({ requestId, studentId, session });
      });
      return result;
    } catch (err) {
      // Fallback for standalone MongoDB instances without replica set
      if (err.message && err.message.includes('Transaction numbers are only allowed')) {
        return await this._executeAccept({ requestId, studentId, session: null });
      }
      throw err;
    } finally {
      session.endSession();
    }
  }

  async _executeAccept({ requestId, studentId, session }) {
    const opts = session ? { session } : {};

    const request = await JoinRequest.findById(requestId).session(session);
    if (!request) throw new Error('Join request not found.');

    if (request.toStudent.toString() !== studentId.toString()) {
      throw new Error('Only the recipient of the invitation can accept this request.');
    }

    if (request.status !== JOIN_REQUEST_STATUS.PENDING) {
      throw new Error(`Request cannot be accepted because it is currently '${request.status}'.`);
    }

    const batch = await Batch.findById(request.batchId).session(session);
    if (!batch) throw new Error('Associated batch not found.');

    const fromTeam = await Team.findOne({ members: request.fromStudent, batchId: request.batchId }).session(session);
    const toTeam = await Team.findOne({ members: request.toStudent, batchId: request.batchId }).session(session);

    let targetTeam = null;

    if (fromTeam && toTeam) {
      if (fromTeam._id.toString() === toTeam._id.toString()) {
        throw new Error('Both students are already in the same team.');
      }
      throw new Error('Cannot merge two separate multi-member teams directly.');
    } else if (fromTeam) {
      if (fromTeam.members.length >= batch.maxTeamSize) {
        throw new Error(`Team has reached maximum capacity (${batch.maxTeamSize}).`);
      }
      fromTeam.members.push(request.toStudent);
      targetTeam = fromTeam;
    } else if (toTeam) {
      if (toTeam.members.length >= batch.maxTeamSize) {
        throw new Error(`Team has reached maximum capacity (${batch.maxTeamSize}).`);
      }
      toTeam.members.push(request.fromStudent);
      targetTeam = toTeam;
    } else {
      // Create new team
      const fromUser = await User.findById(request.fromStudent).session(session);
      const teamName = `Team ${fromUser ? fromUser.name.split(' ')[0] : 'Project'}`;
      
      const newTeam = new Team({
        batchId: request.batchId,
        name: teamName,
        members: [request.fromStudent, request.toStudent],
        status: TEAM_STATUS.FORMING
      });
      await newTeam.save(opts);
      targetTeam = newTeam;
    }

    // Check if team capacity triggers status change
    if (targetTeam.members.length >= batch.minTeamSize && targetTeam.assignedTeacherId) {
      targetTeam.status = TEAM_STATUS.ACTIVE;
    }
    await targetTeam.save(opts);

    // Update request status
    request.status = JOIN_REQUEST_STATUS.ACCEPTED;
    await request.save(opts);

    // Auto-reject other pending requests if team reached max capacity
    if (targetTeam.members.length >= batch.maxTeamSize) {
      await JoinRequest.updateMany(
        {
          batchId: request.batchId,
          status: JOIN_REQUEST_STATUS.PENDING,
          $or: [
            { fromStudent: { $in: targetTeam.members } },
            { toStudent: { $in: targetTeam.members } }
          ]
        },
        { status: JOIN_REQUEST_STATUS.REJECTED },
        opts
      );
    }

    return { team: targetTeam, request };
  }

  /**
   * Reject a join request
   */
  async rejectJoinRequest({ requestId, studentId }) {
    const request = await JoinRequest.findById(requestId);
    if (!request) throw new Error('Join request not found.');

    if (request.toStudent.toString() !== studentId.toString()) {
      throw new Error('Only the recipient of the invitation can reject this request.');
    }

    request.status = JOIN_REQUEST_STATUS.REJECTED;
    await request.save();
    return request;
  }
  /**
   * Cancel a pending join request (sender only)
   */
  async cancelJoinRequest({ requestId, studentId }) {
    const request = await JoinRequest.findById(requestId);
    if (!request) throw new Error('Join request not found.');

    if (request.fromStudent.toString() !== studentId.toString()) {
      throw new Error('Only the sender of the invitation can cancel this request.');
    }

    if (request.status !== JOIN_REQUEST_STATUS.PENDING) {
      throw new Error(`Request cannot be cancelled because it is currently '${request.status}'.`);
    }

    request.status = JOIN_REQUEST_STATUS.REJECTED; // or create a 'CANCELLED' status, but rejected is standard
    await request.save();
    return request;
  }

  /**
   * Get candidates in the batch who are not in a full team
   */
  async getCandidates(batchId) {
    const batch = await Batch.findById(batchId);
    if (!batch) throw new Error('Invalid batch ID.');

    // Find all users in this cohort
    const students = await User.find({ cohortId: batch.cohortId, role: 'student', isActive: true }).select('name email githubUsername');
    
    // Find all teams in this batch
    const teams = await Team.find({ batchId });
    
    // Build a map of full teams
    const fullTeamMemberIds = new Set();
    for (const team of teams) {
      if (team.members.length >= batch.maxTeamSize) {
        team.members.forEach(m => fullTeamMemberIds.add(m.toString()));
      }
    }

    // Filter students who are not in a full team
    return students.filter(s => !fullTeamMemberIds.has(s._id.toString()));
  }

  /**
   * Get join requests sent and received by the student
   */
  async getJoinRequests(studentId) {
    const sent = await JoinRequest.find({ fromStudent: studentId })
      .populate('toStudent', 'name email')
      .sort({ createdAt: -1 });
      
    const received = await JoinRequest.find({ toStudent: studentId })
      .populate('fromStudent', 'name email')
      .sort({ createdAt: -1 });

    return { sent, received };
  }
}

module.exports = new TeamFormationService();
