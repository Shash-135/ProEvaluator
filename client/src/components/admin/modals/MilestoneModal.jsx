import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';

export const MilestoneModal = ({ setShowMilestoneModal, activeBatchId }) => {
  const queryClient = useQueryClient();
  const [mOrder, setMOrder] = useState(1);
  const [mTitle, setMTitle] = useState('');
  const [mMaxScore, setMMaxScore] = useState(100);
  const [mRubric, setMRubric] = useState('');
  const [mRequiresExternalReview, setMRequiresExternalReview] = useState(false);

  const createMilestoneMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/admin/milestones', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-milestones'] });
      setShowMilestoneModal(false);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-foreground mb-4">Add Milestone Template</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMilestoneMutation.mutate({
              batchId: activeBatchId,
              order: Number(mOrder),
              title: mTitle,
              maxScore: Number(mMaxScore),
              rubric: mRubric,
              requiresExternalReview: mRequiresExternalReview
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Order</label>
              <input
                type="number"
                min="1"
                value={mOrder}
                onChange={(e) => setMOrder(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Max Score</label>
              <input
                type="number"
                value={mMaxScore}
                onChange={(e) => setMMaxScore(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
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

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowMilestoneModal(false)}
              className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors">
              Save Milestone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
