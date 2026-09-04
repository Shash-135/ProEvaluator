import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';

export const CohortModal = ({ setShowCohortModal }) => {
  const queryClient = useQueryClient();
  const [cohortName, setCohortName] = useState('');

  const createCohortMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/admin/cohorts', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] });
      setShowCohortModal(false);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-foreground mb-4">Create New Cohort</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCohortMutation.mutate({ name: cohortName });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Cohort Name</label>
            <input
              type="text"
              required
              value={cohortName}
              onChange={(e) => setCohortName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
              placeholder="e.g. 2025-2027"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowCohortModal(false)}
              className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors">
              Create Cohort
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
