import React, { useState, useEffect } from 'react';
import { useUiStore } from '../store/useUiStore';
import { useAuthStore } from '../store/useAuthStore';
import { X, CheckCircle, AlertCircle, Award, MessageSquare } from 'lucide-react';
import api from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

export const GradeModal = () => {
  const { isGradeModalOpen, selectedStudentForGrading, selectedMilestoneForGrading, closeGradeModal } = useUiStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedMilestoneForGrading) {
      if (user?.role === 'external' && selectedMilestoneForGrading.requiresExternalReview) {
        setScore(selectedMilestoneForGrading.externalScore || '');
        setComments(selectedMilestoneForGrading.externalComments || '');
      } else {
        setScore(selectedMilestoneForGrading.score || '');
        setComments(selectedMilestoneForGrading.comments || '');
      }
      setError('');
    }
  }, [selectedMilestoneForGrading, user]);

  if (!isGradeModalOpen || !selectedStudentForGrading || !selectedMilestoneForGrading) {
    return null;
  }

  const milestoneObj = selectedMilestoneForGrading.milestoneId || selectedMilestoneForGrading;
  const milestoneId = milestoneObj._id || selectedMilestoneForGrading.milestoneId;
  const maxScore = milestoneObj.maxScore || 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const endpoint = user?.role === 'external' ? '/external/grade' : '/teacher/grade';
      
      await api.patch(endpoint, {
        studentId: selectedStudentForGrading._id,
        milestoneId,
        score: Number(score),
        comments
      });

      queryClient.invalidateQueries({ queryKey: ['team-summary'] });
      queryClient.invalidateQueries({ queryKey: ['student-scores'] });
      closeGradeModal();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
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
                 <Award size={16} />
               </div>
               <h3 className="text-lg font-bold text-foreground">Evaluate Milestone</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              Evaluating <span className="text-foreground font-semibold">{selectedStudentForGrading.name}</span>
            </p>
          </div>
          <button
            onClick={closeGradeModal}
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 rounded-xl bg-background border border-border">
             <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Milestone Name</div>
             <div className="text-base font-bold text-foreground">{milestoneObj.title}</div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm placeholder:text-muted-foreground/50 transition-all"
                  placeholder={`Max score: ${maxScore}`}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted-foreground font-medium text-sm">
                  / {maxScore} pts
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Evaluation Feedback & Comments
              </label>
              <div className="relative">
                 <div className="absolute top-3 left-3 text-muted-foreground">
                   <MessageSquare size={16} />
                 </div>
                <textarea
                  rows="4"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm placeholder:text-muted-foreground/50 transition-all resize-none"
                  placeholder="Provide constructive feedback for the student..."
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <button
                type="button"
                onClick={closeGradeModal}
                className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {submitting ? (
                   <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                ) : (
                  <CheckCircle size={16} className="group-hover:scale-110 transition-transform" />
                )}
                {submitting ? 'Saving...' : 'Save Evaluation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
