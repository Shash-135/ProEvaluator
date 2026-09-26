import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { Users, AlertCircle, X } from 'lucide-react';

export const TeamModal = ({
  setShowModal,
  batchId,
  editingTeam = null,
  teachers = [],
  onClose
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState(editingTeam?.name || '');
  const [repoUrl, setRepoUrl] = useState(editingTeam?.repoUrl || '');
  const [assignedTeacherId, setAssignedTeacherId] = useState(
    editingTeam?.assignedTeacherId?.id || editingTeam?.assignedTeacherId?._id || editingTeam?.assignedTeacherId || ''
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingTeam) {
      setName(editingTeam.name || '');
      setRepoUrl(editingTeam.repoUrl || '');
      setAssignedTeacherId(
        editingTeam.assignedTeacherId?.id || editingTeam.assignedTeacherId?._id || editingTeam.assignedTeacherId || ''
      );
    } else {
      setName('');
      setRepoUrl('');
      setAssignedTeacherId('');
    }
    setErrorMsg('');
  }, [editingTeam]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (setShowModal) {
      setShowModal(false);
    }
  };

  const saveTeamMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingTeam) {
        return (await api.patch(`/admin/teams/${editingTeam.id || editingTeam._id}`, payload)).data;
      }
      return (await api.post('/admin/teams', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      handleClose();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save team.');
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
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
          title="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {editingTeam ? 'Edit Team Details' : 'Create New Team'}
            </h3>
            <p className="text-xs text-muted-foreground">Configure name, repository, and evaluator assignments.</p>
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
            if (!name.trim()) {
              setErrorMsg('Team name is required.');
              return;
            }
            const payload = {
              name: name.trim(),
              repoUrl: repoUrl.trim(),
              assignedTeacherId: assignedTeacherId || null
            };
            if (!editingTeam) {
              payload.batchId = batchId;
            }
            saveTeamMutation.mutate(payload);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Team Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              GitHub Repository URL
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Assigned Faculty Evaluator
            </label>
            <select
              value={assignedTeacherId}
              onChange={(e) => setAssignedTeacherId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No Evaluator Assigned</option>
              {teachers.map((t) => (
                <option key={t.id || t._id} value={t.id || t._id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
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
              disabled={saveTeamMutation.isPending}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saveTeamMutation.isPending ? 'Saving...' : editingTeam ? 'Save Changes' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
