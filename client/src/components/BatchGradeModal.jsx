import React, { useState } from 'react';
import { X, Award, CheckCircle2, AlertCircle, Users, MessageSquare, BookOpen, ExternalLink, Clock } from 'lucide-react';
import api from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

export const BatchGradeModal = ({ isOpen, onClose, team, summaryData }) => {
  const queryClient = useQueryClient();

  const [selectedMilestoneOrder, setSelectedMilestoneOrder] = useState('');
  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !team) return null;

  const sampleStudent = summaryData?.students?.[0];
  const milestones = sampleStudent?.scores || [];

  const activeMilestone = milestones.find(m => String(m.order) === String(selectedMilestoneOrder));
  const maxScore = activeMilestone?.maxScore || 100;

  const requiresDeliverable = activeMilestone?.milestoneId?.requiresDeliverable || activeMilestone?.requiresDeliverable;
  const studentsMissingDeliverable = requiresDeliverable
    ? (summaryData?.students || []).filter(s => {
        const scoreItem = (s.scores || []).find(sc => String(sc.order) === String(selectedMilestoneOrder));
        return !scoreItem?.deliverableUrl?.trim();
      })
    : [];

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMilestoneOrder) {
      setError('Please select a milestone to grade.');
      return;
    }

    if (studentsMissingDeliverable.length > 0) {
      setError(`Evaluation blocked: ${studentsMissingDeliverable.length} student(s) have not submitted their required deliverable yet.`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const milestoneId = activeMilestone?.milestoneId?._id || activeMilestone?.milestoneId;
      if (!milestoneId) throw new Error('Milestone ID not found');

      // Grade each student in the team
      const studentIds = summaryData.students.map(s => s.student._id);
      await Promise.all(
        studentIds.map(studentId =>
          api.patch('/teacher/grade', {
            studentId,
            milestoneId,
            score: Number(score),
            comments
          })
        )
      );

      queryClient.invalidateQueries({ queryKey: ['team-summary'] });
      queryClient.invalidateQueries({ queryKey: ['student-scores'] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit batch grades');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-muted/30 px-6 py-5 border-b border-border flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users size={16} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Grade Entire Team</h3>
            </div>
            <p className="text-xs text-muted-foreground ml-10">
              Apply a common baseline score & feedback to all members of <span className="text-foreground font-semibold">{team.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Select Milestone
              </label>
              <select
                value={selectedMilestoneOrder}
                onChange={(e) => setSelectedMilestoneOrder(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              >
                <option value="">-- Choose Milestone --</option>
                {milestones.map((m) => (
                  <option key={m.order} value={m.order}>
                    Milestone {m.order}: {m.milestoneId?.title || 'Milestone'} (Max {m.maxScore} pts)
                  </option>
                ))}
              </select>
            </div>

            {activeMilestone && (
              <div className="space-y-3">
                {activeMilestone?.milestoneId?.rubric && (
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <BookOpen size={13} className="text-primary" />
                      <span>Grading Rubric</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed">
                      {activeMilestone.milestoneId.rubric}
                    </p>
                  </div>
                )}

                {(() => {
                  const studentDeliverables = (summaryData?.students || [])
                    .map((s) => {
                      const scoreItem = (s.scores || []).find(
                        (sc) => String(sc.order) === String(selectedMilestoneOrder)
                      );
                      return {
                        name: s.student.name,
                        deliverableUrl: scoreItem?.deliverableUrl,
                        submittedAt: scoreItem?.submittedAt
                      };
                    })
                    .filter((d) => d.deliverableUrl);

                  if (studentDeliverables.length === 0) return null;

                  return (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
                        Team Member Deliverables ({studentDeliverables.length})
                      </span>
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                        {studentDeliverables.map((sd, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] bg-background/80 px-2.5 py-1.5 rounded-lg border border-border">
                            <span className="font-semibold text-foreground truncate max-w-[140px]">{sd.name}</span>
                            <a
                              href={sd.deliverableUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-bold flex items-center gap-1 shrink-0"
                            >
                              Inspect Work <ExternalLink size={10} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Awarded Score (0 - {maxScore})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={maxScore}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  required
                  placeholder={`Max: ${maxScore}`}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted-foreground font-medium text-xs">
                  / {maxScore} pts
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Team Feedback / Project Defense Comments
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 text-muted-foreground">
                  <MessageSquare size={14} />
                </div>
                <textarea
                  rows="3"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm resize-none"
                  placeholder="Shared evaluation feedback for the team..."
                ></textarea>
              </div>
            </div>

            {selectedMilestoneOrder && studentsMissingDeliverable.length > 0 && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle size={14} />
                  <span>Mandatory Deliverable Missing ({studentsMissingDeliverable.length} student{studentsMissingDeliverable.length > 1 ? 's' : ''})</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  The following students have not submitted the mandatory milestone deliverable:
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {studentsMissingDeliverable.map(s => (
                    <span key={s.student._id} className="bg-destructive/20 text-destructive font-bold px-2 py-0.5 rounded text-[10px]">
                      {s.student.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">Note: </span>
              This score will be applied to all <span className="font-bold text-foreground">{summaryData?.students?.length || 0}</span> students. You can still adjust individual member scores in the matrix afterwards.
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || studentsMissingDeliverable.length > 0}
                className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title={studentsMissingDeliverable.length > 0 ? 'Deliverable submissions required' : ''}
              >
                {submitting
                  ? 'Applying Grades...'
                  : studentsMissingDeliverable.length > 0
                  ? 'Blocked: Deliverables Pending'
                  : 'Grade Entire Team'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
