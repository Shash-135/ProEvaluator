import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { UserCheck, AlertCircle, CheckCircle2, Award } from 'lucide-react';

export const AutoAssignFacultyModal = ({ setShowModal, batch }) => {
  const queryClient = useQueryClient();
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [assignments, setAssignments] = useState(null);

  const autoAssignMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/admin/teams/auto-assign-teachers', payload)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setResultMessage({
        type: 'success',
        text: data.message || `Assigned ${data.assignedCount} teams across ${data.teacherCount} teachers.`
      });
      setAssignments(data.distribution || []);
    },
    onError: (err) => {
      setResultMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to auto-assign teachers.'
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
            <UserCheck size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Auto-Assign Faculty Evaluators</h3>
            <p className="text-xs text-muted-foreground">Fairly and equally distribute teams among available faculty.</p>
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
            <Award size={14} className="text-blue-500" /> Balanced Allocation Engine
          </div>
          <p>
            Teams will be randomized and assigned round-robin across all active teachers, guaranteeing that every faculty
            member receives an equal workload (differing by at most 1 team).
          </p>
        </div>

        {!assignments ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              autoAssignMutation.mutate({
                batchId: batch?.id || batch?._id,
                onlyUnassigned
              });
            }}
            className="space-y-4"
          >
            <div className="bg-muted/30 border border-border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="onlyUnassigned"
                checked={onlyUnassigned}
                onChange={(e) => setOnlyUnassigned(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="onlyUnassigned" className="text-xs font-semibold text-foreground cursor-pointer">
                Only assign teams currently without an assigned teacher
                <span className="block text-[11px] font-normal text-muted-foreground">
                  Uncheck to re-balance and redistribute all teams in this semester.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={autoAssignMutation.isPending}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <UserCheck size={16} />
                {autoAssignMutation.isPending ? 'Distributing Teams...' : 'Distribute Teams Equally'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Assignment Distribution:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {assignments.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-background border border-border text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-foreground">{item.teacher?.name}</span>
                    <span className="text-[10px] text-muted-foreground block">{item.teacher?.email}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px]">
                      {item.teams?.length || 0} Teams
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
                      {item.teams?.map(t => t.name).join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl shadow-sm hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
