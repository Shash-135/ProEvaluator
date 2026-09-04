import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { UserCheck, UserPlus, Edit2 } from 'lucide-react';

export const UsersTab = ({ setShowAddUserModal }) => {
  const queryClient = useQueryClient();
  const [editingGithubUserId, setEditingGithubUserId] = useState(null);
  const [newGithubInput, setNewGithubInput] = useState('');
  const [activeRoleTab, setActiveRoleTab] = useState('faculty');
  const [activeCohortKey, setActiveCohortKey] = useState('');

  const { data: allUsersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data
  });

  const allUsers = allUsersData?.users || [];
  const teachers = allUsers.filter((u) => u.role === 'teacher');
  
  const staffUsers = allUsers.filter(u => u.role !== 'student');
  const studentUsers = allUsers.filter(u => u.role === 'student');
  
  const studentsByCohort = studentUsers.reduce((acc, u) => {
    const cohortName = u.cohort?.name || 'Unassigned Cohort';
    const key = cohortName.trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});

  const cohortKeys = Object.keys(studentsByCohort);
  if (activeRoleTab === 'students' && !activeCohortKey && cohortKeys.length > 0) {
    setActiveCohortKey(cohortKeys[0]);
  }

  const toggleUserActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }) => (await api.patch(`/admin/users/${userId}/active`, { isActive })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  });

  const updateGithubMutation = useMutation({
    mutationFn: async ({ userId, githubUsername }) =>
      (await api.patch(`/admin/users/${userId}/github`, { githubUsername })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingGithubUserId(null);
    }
  });

  const pairEvaluatorMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/admin/teams/pair-evaluator', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      alert('External evaluator paired cleanly with internal teacher!');
    }
  });

  const promoteTeacherMutation = useMutation({
    mutationFn: async (userId) => (await api.patch(`/admin/users/${userId}/promote-admin`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  });

  const renderUserRow = (u) => (
    <tr key={u.id || u._id} className="hover:bg-muted/30 transition-colors">
      <td className="py-4 px-4">
        <div className="font-bold text-foreground">{u.name}</div>
        <div className="text-[10px] font-medium text-muted-foreground mt-0.5">{u.email}</div>
      </td>

      <td className="py-4 px-3 font-bold uppercase text-[9px]">
        <span className={`px-2 py-1 rounded-md border ${
          u.role === 'admin'
            ? 'bg-primary/10 text-primary border-primary/20'
            : u.role === 'teacher'
            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            : u.role === 'external'
            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        }`}>
          {u.role}
        </span>
      </td>

      <td className="py-4 px-3">
        <span className={`px-2 py-1 rounded-md text-[9px] font-bold border ${
          u.isActive !== false
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            : 'bg-destructive/10 text-destructive border-destructive/20'
        }`}>
          {u.isActive !== false ? 'ACTIVE' : 'DEACTIVATED'}
        </span>
      </td>

      <td className="py-4 px-3">
        {editingGithubUserId === (u.id || u._id) ? (
          <div className="flex gap-2">
            <input
              type="text"
              defaultValue={u.githubUsername || ''}
              onChange={(e) => setNewGithubInput(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <button
              onClick={() => updateGithubMutation.mutate({ userId: u.id || u._id, githubUsername: newGithubInput })}
              className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-[10px] transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">@{u.githubUsername || <span className="text-muted-foreground italic">unlinked</span>}</span>
            {u.role === 'student' && (
              <button
                onClick={() => {
                  setEditingGithubUserId(u.id || u._id);
                  setNewGithubInput(u.githubUsername || '');
                }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors bg-muted rounded-md"
              >
                <Edit2 size={12} />
              </button>
            )}
          </div>
        )}
      </td>

      <td className="py-4 px-3 text-xs font-medium text-muted-foreground">
        {u.role === 'external' && u.linkedExternalTo ? (
          <span className="text-amber-600 font-bold bg-amber-500/10 px-2 py-1 rounded-md">Linked to: {u.linkedExternalTo.name}</span>
        ) : u.role === 'external' ? (
          <select
            onChange={(e) => {
              if (e.target.value) {
                pairEvaluatorMutation.mutate({ teacherId: e.target.value, externalId: u.id || u._id });
              }
            }}
            className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">Pair Teacher...</option>
            {teachers.map((t) => (
              <option key={t.id || t._id} value={t.id || t._id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : (
          '-'
        )}
      </td>

      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {u.role === 'teacher' && (
            <button
              onClick={() => promoteTeacherMutation.mutate(u.id || u._id)}
              className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/20 text-[10px] font-bold transition-colors"
              title="Promote to Admin"
            >
              Promote Admin
            </button>
          )}

          <button
            onClick={() => toggleUserActiveMutation.mutate({ userId: u.id || u._id, isActive: u.isActive === false })}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
              u.isActive !== false
                ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20'
            }`}
          >
            {u.isActive !== false ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <UserCheck size={18} className="text-emerald-500" /> Users
          </h3>
        </div>

        <button
          onClick={() => setShowAddUserModal(true)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm whitespace-nowrap"
        >
          <UserPlus size={14} /> Add Faculty Account
        </button>
      </div>

      <div className="flex gap-2 bg-muted/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveRoleTab('faculty')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeRoleTab === 'faculty' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Faculty & Staff
        </button>
        <button
          onClick={() => {
            setActiveRoleTab('students');
            if (!activeCohortKey && cohortKeys.length > 0) setActiveCohortKey(cohortKeys[0]);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeRoleTab === 'students' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Students
        </button>
      </div>

      {activeRoleTab === 'students' && cohortKeys.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {cohortKeys.map(key => (
            <button
              key={key}
              onClick={() => setActiveCohortKey(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                activeCohortKey === key
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-border font-bold text-muted-foreground uppercase tracking-wider text-[10px] bg-muted/50">
              <th className="py-3 px-4 rounded-tl-xl">Name & Email</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">GitHub Username</th>
              <th className="py-3 px-3">Pairing / Link</th>
              <th className="py-3 px-4 text-right rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeRoleTab === 'faculty' && staffUsers.length > 0 && (
              staffUsers.map(u => renderUserRow(u))
            )}

            {activeRoleTab === 'students' && activeCohortKey && studentsByCohort[activeCohortKey] && (
              studentsByCohort[activeCohortKey].map(u => renderUserRow(u))
            )}
            
            {activeRoleTab === 'faculty' && staffUsers.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-muted-foreground font-medium border-2 border-dashed border-border rounded-xl">
                  No faculty found.
                </td>
              </tr>
            )}

            {activeRoleTab === 'students' && cohortKeys.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-muted-foreground font-medium border-2 border-dashed border-border rounded-xl">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
