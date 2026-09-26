import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { BookOpen, AlertCircle, X } from 'lucide-react';

export const MilestoneModal = ({
  setShowMilestoneModal,
  activeBatchId,
  editingMilestone = null,
  setEditingMilestone = () => {},
  onClose
}) => {
  const queryClient = useQueryClient();
  const [mOrder, setMOrder] = useState(editingMilestone?.order ?? 1);
  const [mTitle, setMTitle] = useState(editingMilestone?.title || '');
  const [mMaxScore, setMMaxScore] = useState(editingMilestone?.maxScore ?? 100);
  const [mRubric, setMRubric] = useState(editingMilestone?.rubric || '');
  const [mRequiresExternalReview, setMRequiresExternalReview] = useState(editingMilestone?.requiresExternalReview ?? false);
  const [mRequiresDeliverable, setMRequiresDeliverable] = useState(editingMilestone?.requiresDeliverable ?? false);
  const [mDeliverableInstructions, setMDeliverableInstructions] = useState(editingMilestone?.deliverableInstructions || '');
  const [mDueDate, setMDueDate] = useState(
    editingMilestone?.dueDate ? new Date(editingMilestone.dueDate).toISOString().split('T')[0] : ''
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingMilestone) {
      setMOrder(editingMilestone.order ?? 1);
      setMTitle(editingMilestone.title || '');
      setMMaxScore(editingMilestone.maxScore ?? 100);
      setMRubric(editingMilestone.rubric || '');
      setMRequiresExternalReview(editingMilestone.requiresExternalReview ?? false);
      setMRequiresDeliverable(editingMilestone.requiresDeliverable ?? false);
      setMDeliverableInstructions(editingMilestone.deliverableInstructions || '');
      setMDueDate(editingMilestone.dueDate ? new Date(editingMilestone.dueDate).toISOString().split('T')[0] : '');
    } else {
      setMOrder(1);
      setMTitle('');
      setMMaxScore(100);
      setMRubric('');
      setMRequiresExternalReview(false);
      setMRequiresDeliverable(false);
      setMDeliverableInstructions('');
      setMDueDate('');
    }
    setErrorMsg('');
  }, [editingMilestone]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      if (setShowMilestoneModal) setShowMilestoneModal(false);
      if (setEditingMilestone) setEditingMilestone(null);
    }
  };

  const saveMilestoneMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingMilestone) {
        return (await api.patch(`/admin/milestones/${editingMilestone.id || editingMilestone._id}`, payload)).data;
      }
      return (await api.post('/admin/milestones', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-milestones'] });
      handleClose();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save milestone.');
    }
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
          title="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <BookOpen size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {editingMilestone ? 'Edit Milestone Template' : 'Add Milestone Template'}
            </h3>
            <p className="text-xs text-muted-foreground">Define scoring rubric and deliverables.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2 mb-4">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!mTitle.trim()) {
              setErrorMsg('Milestone title is required.');
              return;
            }
            const payload = {
              order: Number(mOrder),
              title: mTitle.trim(),
              maxScore: Number(mMaxScore),
              rubric: mRubric.trim(),
              requiresExternalReview: mRequiresExternalReview,
              requiresDeliverable: mRequiresDeliverable,
              deliverableInstructions: mDeliverableInstructions.trim(),
              dueDate: mDueDate ? new Date(mDueDate).toISOString() : null
            };
            if (!editingMilestone) {
              payload.batchId = activeBatchId;
            }
            saveMilestoneMutation.mutate(payload);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Order</label>
              <input
                type="number"
                min="1"
                required
                value={mOrder}
                onChange={(e) => setMOrder(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Max Score</label>
              <input
                type="number"
                min="1"
                required
                value={mMaxScore}
                onChange={(e) => setMMaxScore(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Submission Deadline (Due Date)</label>
            <input
              type="date"
              value={mDueDate}
              onChange={(e) => setMDueDate(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Milestone Title</label>
            <input
              type="text"
              required
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
              placeholder="e.g. Milestone 1: System Design"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Rubric</label>
            <textarea
              rows="3"
              value={mRubric}
              onChange={(e) => setMRubric(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50 resize-none"
              placeholder="Criteria for scoring..."
            ></textarea>
          </div>

          <div className="flex items-center gap-2 mt-4 bg-muted/50 p-3 rounded-xl border border-border">
            <input
              type="checkbox"
              id="reqExtRev"
              checked={mRequiresExternalReview}
              onChange={(e) => setMRequiresExternalReview(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
            />
            <label htmlFor="reqExtRev" className="text-sm font-semibold text-foreground cursor-pointer">
              Requires Independent External Review
            </label>
          </div>

          <div className="space-y-3 bg-muted/50 p-3.5 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reqDeliv"
                checked={mRequiresDeliverable}
                onChange={(e) => setMRequiresDeliverable(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <label htmlFor="reqDeliv" className="text-sm font-semibold text-foreground cursor-pointer">
                Mandatory Student Deliverable Submission
              </label>
            </div>

            {mRequiresDeliverable && (
              <div className="pt-2 border-t border-border/60">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Deliverable Instructions / Type
                </label>
                <input
                  type="text"
                  value={mDeliverableInstructions}
                  onChange={(e) => setMDeliverableInstructions(e.target.value)}
                  placeholder="e.g. Pull Request URL, Demo video, or Report PDF link"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMilestoneMutation.isPending}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saveMilestoneMutation.isPending ? 'Saving...' : editingMilestone ? 'Save Changes' : 'Save Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
