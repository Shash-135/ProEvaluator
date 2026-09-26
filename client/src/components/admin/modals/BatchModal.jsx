import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';

export const BatchModal = ({ setShowBatchModal, activeCohortId, editingBatch = null, setEditingBatch = () => {} }) => {
  const queryClient = useQueryClient();
  const [batchName, setBatchName] = useState(editingBatch?.name || '');
  const [minTeamSize, setMinTeamSize] = useState(editingBatch?.minTeamSize ?? 2);
  const [maxTeamSize, setMaxTeamSize] = useState(editingBatch?.maxTeamSize ?? 4);

  useEffect(() => {
    if (editingBatch) {
      setBatchName(editingBatch.name || '');
      setMinTeamSize(editingBatch.minTeamSize ?? 2);
      setMaxTeamSize(editingBatch.maxTeamSize ?? 4);
    }
  }, [editingBatch]);

  const saveBatchMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingBatch) {
        return (await api.patch(`/admin/batches/${editingBatch.id || editingBatch._id}`, payload)).data;
      }
      return (await api.post('/admin/batches', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
      setShowBatchModal(false);
      setEditingBatch(null);
    }
  });

  const handleClose = () => {
    setShowBatchModal(false);
    setEditingBatch(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-foreground mb-4">
          {editingBatch ? 'Edit Semester / Batch' : 'Create New Academic Batch'}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const payload = {
              name: batchName,
              minTeamSize,
              maxTeamSize
            };
            if (!editingBatch) {
              payload.cohortId = activeCohortId;
            }
            saveBatchMutation.mutate(payload);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Batch Name</label>
            <input
              type="text"
              required
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
              placeholder="e.g. Semester 1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Min Team Size</label>
              <input
                type="number"
                min="1"
                value={minTeamSize}
                onChange={(e) => setMinTeamSize(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Max Team Size</label>
              <input
                type="number"
                min="1"
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveBatchMutation.isPending}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {saveBatchMutation.isPending ? 'Saving...' : editingBatch ? 'Save Changes' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

