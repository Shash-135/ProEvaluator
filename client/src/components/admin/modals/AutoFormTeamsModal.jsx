import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { Shuffle, AlertCircle, CheckCircle2, Users, X } from 'lucide-react';

export const AutoFormTeamsModal = ({ setShowModal, batch, onClose }) => {
  const queryClient = useQueryClient();
  const [minTeamSize, setMinTeamSize] = useState(batch?.minTeamSize ?? 2);
  const [maxTeamSize, setMaxTeamSize] = useState(batch?.maxTeamSize ?? 4);
  const [prefix, setPrefix] = useState('Team');
  const [resultMessage, setResultMessage] = useState(null);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (setShowModal) {
      setShowModal(false);
    }
  };

  const autoFormMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/admin/teams/auto-form', payload)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setResultMessage({
        type: 'success',
        text: data.message || `Formed ${data.createdTeams?.length || 0} teams successfully.`
      });
      setTimeout(() => {
        handleClose();
      }, 1500);
    },
    onError: (err) => {
      setResultMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to auto-form teams.'
      });
    }
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl relative animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
          title="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Shuffle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Auto-Form Teams</h3>
            <p className="text-xs text-muted-foreground">Randomly group remaining unassigned students into balanced teams.</p>
          </div>
        </div>

        {resultMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 mb-4 ${
              resultMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}
          >
            {resultMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{resultMessage.text}</span>
          </div>
        )}

        <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5 mb-5 text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Users size={14} className="text-primary" /> Semester: {batch?.name}
          </div>
          <p>
            All active students in this cohort who are not yet part of any active/forming team will be randomly shuffled
            and partitioned into teams respecting your team size bounds.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            autoFormMutation.mutate({
              batchId: batch?.id || batch?._id,
              minTeamSize: Number(minTeamSize),
              maxTeamSize: Number(maxTeamSize),
              prefix: prefix.trim() || 'Team'
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Team Name Prefix
            </label>
            <input
              type="text"
              required
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Team"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Min Team Size
              </label>
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
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Max Team Size
              </label>
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
              disabled={autoFormMutation.isPending}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Shuffle size={16} />
              {autoFormMutation.isPending ? 'Forming Teams...' : 'Auto-Form Teams'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
