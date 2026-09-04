const Milestone = require('../models/Milestone');
const StudentMilestoneScore = require('../models/StudentMilestoneScore');
const milestoneService = require('../services/milestone.service');
const { ROLES } = require('../constants');

exports.createMilestone = async (req, res) => {
  try {
    const { batchId, order, title, maxScore, rubric, dueDate } = req.body;
    const milestone = await Milestone.create({
      batchId,
      order,
      title,
      maxScore: maxScore || 100,
      rubric,
      dueDate
    });
    return res.status(201).json({ milestone });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to create milestone: ' + error.message });
  }
};

exports.getMilestonesByBatch = async (req, res) => {
  try {
    const { batchId } = req.query;
    if (!batchId) return res.status(400).json({ error: 'batchId query parameter is required.' });

    const milestones = await Milestone.find({ batchId }).sort({ order: 1 });
    return res.json({ milestones });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch milestones: ' + error.message });
  }
};

exports.getStudentScores = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { batchId } = req.query;
    
    if (!batchId) {
      return res.status(400).json({ error: 'batchId query parameter is required.' });
    }

    let scoresDoc = await StudentMilestoneScore.findOne({ studentId, batchId })
      .populate('scores.milestoneId', 'title order maxScore rubric dueDate')
      .populate('scores.gradedBy', 'name');

    if (!scoresDoc) {
      // Find user to initialize
      const User = require('../models/User');
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(400).json({ error: 'Student not found.' });
      }
      
      const Batch = require('../models/Batch');
      const batch = await Batch.findById(batchId);
      if(!batch) {
          return res.status(400).json({ error: 'Batch not found.' });
      }

      scoresDoc = await milestoneService.initializeStudentScores({
        studentId,
        batchId: batch._id
      });
      scoresDoc = await StudentMilestoneScore.findById(scoresDoc._id)
        .populate('scores.milestoneId', 'title order maxScore rubric dueDate')
        .populate('scores.gradedBy', 'name');
    }

    return res.json({ studentScore: scoresDoc });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch student milestone scores: ' + error.message });
  }
};

exports.gradeMilestone = async (req, res) => {
  try {
    const { studentId, milestoneId } = req.params;
    const { score, comments } = req.body;

    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'Score is required.' });
    }

    const updatedDoc = await milestoneService.gradeStudentMilestone({
      studentId,
      milestoneId,
      score: Number(score),
      comments,
      teacherId: req.user._id
    });

    return res.json({ message: 'Milestone graded successfully', studentScore: updatedDoc });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getTeamSummary = async (req, res) => {
  try {
    const { teamId } = req.params;
    const summary = await milestoneService.getTeamMilestonesSummary(teamId);
    return res.json({ summary });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch team summary: ' + error.message });
  }
};
