const teamFormationService = require('../services/teamFormation.service');
const JoinRequest = require('../models/JoinRequest');
const { JOIN_REQUEST_STATUS } = require('../constants');

exports.sendRequest = async (req, res) => {
  try {
    const { toStudentId, batchId } = req.body;
    const request = await teamFormationService.sendJoinRequest({
      fromStudentId: req.user._id,
      toStudentId,
      batchId
    });
    return res.status(201).json({ message: 'Join request sent successfully.', request });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const incoming = await JoinRequest.find({
      toStudent: req.user._id,
      status: JOIN_REQUEST_STATUS.PENDING
    }).populate('fromStudent', 'name email githubUsername');

    const outgoing = await JoinRequest.find({
      fromStudent: req.user._id
    }).populate('toStudent', 'name email githubUsername');

    return res.json({ incoming, outgoing });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch join requests: ' + error.message });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await teamFormationService.acceptJoinRequest({
      requestId: id,
      studentId: req.user._id
    });
    return res.json({ message: 'Join request accepted! Team updated.', result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await teamFormationService.rejectJoinRequest({
      requestId: id,
      studentId: req.user._id
    });
    return res.json({ message: 'Join request rejected.', request });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
