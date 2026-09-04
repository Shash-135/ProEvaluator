import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';

export const AssignTeacherModal = ({ assignTeamId, setAssignTeamId, selectedTeacherId, setSelectedTeacherId, teachers }) => {
  const queryClient = useQueryClient();

  const assignTeacherMutation = useMutation({
    mutationFn: async ({ teamId, teacherId }) =>
      (await api.patch(`/admin/teams/${teamId}/assign-teacher`, { teacherId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setAssignTeamId(null);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-foreground mb-4">Assign Teacher to Team</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Select Teacher</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Choose Teacher --</option>
              {teachers.map((t) => (
                <option key={t.id || t._id} value={t.id || t._id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
            <button onClick={() => setAssignTeamId(null)} className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={() => assignTeacherMutation.mutate({ teamId: assignTeamId, teacherId: selectedTeacherId })}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors"
            >
              Confirm Assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
