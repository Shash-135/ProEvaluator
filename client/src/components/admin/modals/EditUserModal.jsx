import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { UserCheck, AlertCircle, X } from 'lucide-react';

export const EditUserModal = ({ user, setShowModal, cohorts = [], onClose }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'student');
  const [cohortId, setCohortId] = useState(user?.cohortId?._id || user?.cohortId || user?.cohort?.id || '');
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || '');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRole(user.role || 'student');
      setCohortId(user.cohortId?._id || user.cohortId || user.cohort?.id || '');
      setGithubUsername(user.githubUsername || '');
    }
    setErrorMsg('');
  }, [user]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (setShowModal) {
      setShowModal(false);
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: async (payload) => (await api.patch(`/admin/users/${user?.id || user?._id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      handleClose();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to update user.');
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
            <UserCheck size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Edit User Profile</h3>
            <p className="text-xs text-muted-foreground">Modify credentials, role, or cohort assignments.</p>
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
              setErrorMsg('Full name is required.');
              return;
            }
            if (!email.trim()) {
              setErrorMsg('Email address is required.');
              return;
            }
            updateUserMutation.mutate({
              name: name.trim(),
              email: email.trim(),
              role,
              cohortId: role === 'student' ? cohortId || null : null,
              githubUsername: githubUsername.trim()
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="external">External Evaluator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                GitHub Username
              </label>
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="e.g. octocat"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {role === 'student' && (
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Assigned Cohort
              </label>
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No Cohort Assigned</option>
                {cohorts.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              disabled={updateUserMutation.isPending}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
