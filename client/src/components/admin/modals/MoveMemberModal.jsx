import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';

export const MoveMemberModal = ({ setShowMoveMemberModal, teamsData }) => {
  const queryClient = useQueryClient();
  const [moveFromTeamId, setMoveFromTeamId] = useState('');
  const [moveToTeamId, setMoveToTeamId] = useState('');
  const [moveStudentId, setMoveStudentId] = useState('');

  const moveMemberMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/admin/teams/move-member', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setShowMoveMemberModal(false);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-foreground mb-4">Move Team Member (Admin Override)</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            moveMemberMutation.mutate({ fromTeamId: moveFromTeamId, toTeamId: moveToTeamId, studentId: moveStudentId });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Source Team</label>
            <select
              required
              value={moveFromTeamId}
              onChange={(e) => setMoveFromTeamId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Choose Source Team --</option>
              {teamsData?.teams?.map((t) => (
                <option key={t.id || t._id} value={t.id || t._id}>
                  {t.name} ({t.members.length} members)
                </option>
              ))}
            </select>
          </div>

          {moveFromTeamId && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Student to Move</label>
              <select
                required
                value={moveStudentId}
                onChange={(e) => setMoveStudentId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Choose Student --</option>
                {teamsData?.teams
                  ?.find((t) => (t.id || t._id) === moveFromTeamId)
                  ?.members?.map((m) => (
                    <option key={m.id || m._id} value={m.id || m._id}>
                      {m.name} (@{m.githubUsername || 'unlinked'})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Target Team</label>
            <select
              required
              value={moveToTeamId}
              onChange={(e) => setMoveToTeamId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Choose Target Team --</option>
              {teamsData?.teams
                ?.filter((t) => (t.id || t._id) !== moveFromTeamId)
                ?.map((t) => (
                  <option key={t.id || t._id} value={t.id || t._id}>
                    {t.name} ({t.members.length} members)
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowMoveMemberModal(false)}
              className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors">
              Execute Move
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
