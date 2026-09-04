const StudentMilestoneScore = require('../models/StudentMilestoneScore');
const Milestone = require('../models/Milestone');
const Team = require('../models/Team');
const { MILESTONE_STATUS } = require('../constants');

class MilestoneService {
  /**
   * Initialize milestone score document for a student in a batch
   */
  async initializeStudentScores({ studentId, batchId, teamId = null }) {
    const milestones = await Milestone.find({ batchId }).sort({ order: 1 });
    
    const defaultScores = milestones.map((m) => ({
      milestoneId: m._id,
      order: m.order,
      score: 0,
      maxScore: m.maxScore,
      status: MILESTONE_STATUS.PENDING,
      comments: ''
    }));

    const progressSummary = {
      completed: 0,
      remaining: milestones.length,
      totalScore: 0,
      percentComplete: 0
    };

    const doc = await StudentMilestoneScore.findOneAndUpdate(
      { studentId, batchId },
      {
        $setOnInsert: {
          studentId,
          batchId,
          teamId,
          scores: defaultScores,
          progressSummary
        }
      },
      { upsert: true, new: true }
    );

    if (teamId && (!doc.teamId || doc.teamId.toString() !== teamId.toString())) {
      doc.teamId = teamId;
      await doc.save();
    }

    return doc;
  }

  /**
   * Grade a specific milestone for an individual student
   */
  async gradeStudentMilestone({ studentId, milestoneId, score, comments, teacherId }) {
    const milestoneTemplate = await Milestone.findById(milestoneId);
    if (!milestoneTemplate) throw new Error('Milestone template not found.');

    if (score < 0 || score > milestoneTemplate.maxScore) {
      throw new Error(`Score must be between 0 and maximum score (${milestoneTemplate.maxScore}).`);
    }

    let studentScoreDoc = await StudentMilestoneScore.findOne({ studentId, batchId: milestoneTemplate.batchId });
    if (!studentScoreDoc) {
      // Find student team
      const team = await Team.findOne({ members: studentId, batchId: milestoneTemplate.batchId });
      studentScoreDoc = await this.initializeStudentScores({
        studentId,
        batchId: milestoneTemplate.batchId,
        teamId: team ? team._id : null
      });
    }

    // Update specific milestone item
    const milestoneItem = studentScoreDoc.scores.find((s) => s.milestoneId.toString() === milestoneId.toString());
    if (!milestoneItem) {
      studentScoreDoc.scores.push({
        milestoneId,
        order: milestoneTemplate.order,
        score,
        maxScore: milestoneTemplate.maxScore,
        status: MILESTONE_STATUS.GRADED,
        gradedBy: teacherId,
        comments: comments || '',
        gradedAt: new Date()
      });
    } else {
      milestoneItem.score = score;
      milestoneItem.status = MILESTONE_STATUS.GRADED;
      milestoneItem.gradedBy = teacherId;
      milestoneItem.comments = comments !== undefined ? comments : milestoneItem.comments;
      milestoneItem.gradedAt = new Date();
    }

    // Recompute progressSummary rollup dynamically from active milestones count
    const totalMilestones = await Milestone.countDocuments({ batchId: milestoneTemplate.batchId });
    let completed = 0;
    let totalScore = 0;

    studentScoreDoc.scores.forEach((s) => {
      if (!s.isOrphaned && s.status === MILESTONE_STATUS.GRADED) {
        completed += 1;
        totalScore += s.score || 0;
      }
    });

    const remaining = Math.max(0, totalMilestones - completed);
    const percentComplete = totalMilestones > 0 ? Math.round((completed / totalMilestones) * 100) : 0;

    studentScoreDoc.progressSummary = {
      completed,
      remaining,
      totalScore,
      percentComplete
    };

    await studentScoreDoc.save();
    return studentScoreDoc;
  }

  /**
   * Get team-wide milestone summary grid (single aggregation call)
   */
  async getTeamMilestonesSummary(teamId) {
    const team = await Team.findById(teamId).populate('members', 'name email githubUsername');
    if (!team) throw new Error('Team not found.');

    const studentIds = team.members.map((m) => m._id);

    // Aggregate student milestone scores for all team members
    const scoresDocs = await StudentMilestoneScore.find({
      studentId: { $in: studentIds }
    }).populate('scores.milestoneId', 'title order maxScore dueDate');

    const scoreMap = new Map();
    scoresDocs.forEach((doc) => scoreMap.set(doc.studentId.toString(), doc));

    const grid = team.members.map((member) => {
      const doc = scoreMap.get(member._id.toString());
      return {
        student: {
          _id: member._id,
          name: member.name,
          email: member.email,
          githubUsername: member.githubUsername
        },
        scores: doc ? doc.scores : [],
        progressSummary: doc ? doc.progressSummary : { completed: 0, remaining: 0, totalScore: 0, percentComplete: 0 }
      };
    });

    return {
      teamId: team._id,
      teamName: team.name,
      students: grid
    };
  }
}

module.exports = new MilestoneService();
