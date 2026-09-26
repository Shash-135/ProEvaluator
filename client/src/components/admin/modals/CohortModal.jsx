import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { BookOpen, AlertCircle, X } from 'lucide-react';

export const CohortModal = ({
  setShowCohortModal,
  editingCohort = null,
  setEditingCohort = () => {},
  onClose
}) => {
  const queryClient = useQueryClient();
  const [cohortName, setCohortName] = useState(editingCohort?.name || '');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingCohort) {
      setCohortName(editingCohort.name || '');
    } else {
      setCohortName('');
    }
    setErrorMsg('');
  }, [editingCohort]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      if (setShowCohortModal) setShowCohortModal(false);
      if (setEditingCohort) setEditingCohort(null);
    }
  };

  const saveCohortMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCohort) {
        return (await api.patch(`/admin/cohorts/${editingCohort.id || editingCohort._id}`, payload)).data;
      }
      return (await api.post('/admin/cohorts', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] });
      handleClose();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save cohort.');
    }
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-200">
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
              {editingCohort ? 'Edit Cohort' : 'Create New Cohort'}
            </h3>
            <p className="text-xs text-muted-foreground">Configure cohort academic year and name.</p>
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
            if (!cohortName.trim()) {
              setErrorMsg('Cohort name is required.');
              return;
            }
            saveCohortMutation.mutate({ name: cohortName.trim() });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Cohort Name
            </label>
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
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveCohortMutation.isPending}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saveCohortMutation.isPending ? 'Saving...' : editingCohort ? 'Save Changes' : 'Create Cohort'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
