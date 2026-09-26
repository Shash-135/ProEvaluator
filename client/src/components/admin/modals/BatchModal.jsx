import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { BookOpen, AlertCircle, X } from 'lucide-react';

export const BatchModal = ({
  setShowBatchModal,
  activeCohortId,
  editingBatch = null,
  setEditingBatch = () => {},
  onClose
}) => {
  const queryClient = useQueryClient();
  const [batchName, setBatchName] = useState(editingBatch?.name || '');
  const [minTeamSize, setMinTeamSize] = useState(editingBatch?.minTeamSize ?? 2);
  const [maxTeamSize, setMaxTeamSize] = useState(editingBatch?.maxTeamSize ?? 4);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingBatch) {
      setBatchName(editingBatch.name || '');
      setMinTeamSize(editingBatch.minTeamSize ?? 2);
      setMaxTeamSize(editingBatch.maxTeamSize ?? 4);
    } else {
      setBatchName('');
      setMinTeamSize(2);
      setMaxTeamSize(4);
    }
    setErrorMsg('');
  }, [editingBatch]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      if (setShowBatchModal) setShowBatchModal(false);
      if (setEditingBatch) setEditingBatch(null);
    }
  };

  const saveBatchMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingBatch) {
        return (await api.patch(`/admin/batches/${editingBatch.id || editingBatch._id}`, payload)).data;
      }
      return (await api.post('/admin/batches', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
      handleClose();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save batch.');
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
              {editingBatch ? 'Edit Semester / Batch' : 'Create New Academic Batch'}
            </h3>
            <p className="text-xs text-muted-foreground">Configure semester name and team sizing limits.</p>
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
            if (!batchName.trim()) {
              setErrorMsg('Batch name is required.');
              return;
            }
            if (Number(minTeamSize) > Number(maxTeamSize)) {
              setErrorMsg('Minimum team size cannot be greater than maximum team size.');
              return;
            }
            const payload = {
              name: batchName.trim(),
              minTeamSize: Number(minTeamSize),
              maxTeamSize: Number(maxTeamSize)
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
                required
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
                required
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
              className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveBatchMutation.isPending}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saveBatchMutation.isPending ? 'Saving...' : editingBatch ? 'Save Changes' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
