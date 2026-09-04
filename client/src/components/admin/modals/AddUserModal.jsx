import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { AlertTriangle } from 'lucide-react';

export const AddUserModal = ({ setShowAddUserModal, activeBatchId, teachers }) => {
  const queryClient = useQueryClient();
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password123');
  const [newUserRole, setNewUserRole] = useState('teacher');
  const [newUserLinkedTeacherId, setNewUserLinkedTeacherId] = useState('');
  const [userModalError, setUserModalError] = useState('');

  const addUserMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/admin/users', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowAddUserModal(false);
    },
    onError: (err) => {
      setUserModalError(err.response?.data?.error || err.message);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-foreground mb-4">Provision Faculty / Evaluator Account</h3>
        
        {userModalError && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
            <AlertTriangle size={16} /> {userModalError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addUserMutation.mutate({
              name: newUserName,
              email: newUserEmail,
              password: newUserPassword,
              role: newUserRole,
              batchId: activeBatchId,
              linkedExternalTo: newUserRole === 'external' ? newUserLinkedTeacherId : undefined
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Account Role</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="teacher">Internal Teacher / Faculty</option>
              <option value="external">External Industry Evaluator</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
              placeholder="e.g. Dr. Alan Smith"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
              placeholder="teacher@college.edu"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Initial Password</label>
            <input
              type="text"
              required
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {newUserRole === 'external' && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Link to Internal Teacher</label>
              <select
                required
                value={newUserLinkedTeacherId}
                onChange={(e) => setNewUserLinkedTeacherId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Choose Internal Teacher --</option>
                {teachers.map((t) => (
                  <option key={t.id || t._id} value={t.id || t._id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowAddUserModal(false)}
              className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background hover:bg-muted border border-border rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-sm transition-colors">
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
