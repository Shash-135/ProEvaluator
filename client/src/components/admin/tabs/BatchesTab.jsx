import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import {
  BookOpen,
  Plus,
  ArrowLeft,
  RefreshCw,
  Users,
  MoveRight,
  XCircle,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Shuffle,
  UserCheck,
  Search,
  Clock,
  AlertCircle,
  Calendar,
  Filter,
  X
} from 'lucide-react';
import { downloadCsv } from '../../../utils/exportCsv';

export const BatchesTab = ({
  cohortsData,
  selectedCohortId,
  setSelectedCohortId,
  batchesData,
  selectedBatchId,
  setSelectedBatchId,
  batchDetailTab,
  setBatchDetailTab,
  setShowBatchModal,
  setEditingBatch,
  setShowCohortModal,
  setEditingCohort,
  setShowMilestoneModal,
  setEditingMilestone,
  setShowMoveMemberModal,
  setAssignTeamId,
  setSelectedTeacherId,
  setShowAutoFormModal,
  setShowAutoAssignModal,
  setShowTeamModal,
  setEditingTeam,
  teachers = []
}) => {
  const queryClient = useQueryClient();
  const activeCohort = cohortsData?.cohorts?.find((c) => (c.id || c._id) === selectedCohortId);
  const activeBatch = batchesData?.batches?.find((b) => (b.id || b._id) === selectedBatchId);
  const activeBatchId = selectedBatchId;

  const cohortBatches = batchesData?.batches?.filter((b) => b.cohortId === selectedCohortId) || [];

  const { data: teamsData } = useQuery({
    queryKey: ['admin-teams', activeBatchId],
    queryFn: async () => (await api.get(`/admin/teams?batchId=${activeBatchId || ''}`)).data,
    enabled: !!activeBatchId
  });

  const { data: milestonesData } = useQuery({
    queryKey: ['admin-milestones', activeBatchId],
    queryFn: async () => (await api.get(`/admin/milestones?batchId=${activeBatchId || ''}`)).data,
    enabled: !!activeBatchId
  });

  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState('all');

  const getMilestoneDeadlineInfo = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const isPast = diffMs < 0;
    const diffDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

    if (isPast) {
      return {
        label: `Overdue (${diffDays}d ago)`,
        badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
        dateText: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        isOverdue: true
      };
    }

    if (diffDays === 0) {
      return {
        label: 'Due Today',
        badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        dateText: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        isOverdue: false
      };
    }

    if (diffDays <= 3) {
      return {
        label: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
        badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        dateText: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        isOverdue: false
      };
    }

    return {
      label: `Due in ${diffDays} days`,
      badgeClass: 'bg-primary/10 text-primary border-primary/20',
      dateText: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      isOverdue: false
    };
  };

  const filteredTeams = useMemo(() => {
    const list = teamsData?.teams || [];
    return list.filter((team) => {
      if (teamStatusFilter === 'needs_evaluator' && team.assignedTeacherId) return false;
      if (
        teamStatusFilter === 'under_capacity' &&
        activeBatch?.minTeamSize &&
        (team.members?.length || 0) >= activeBatch.minTeamSize
      )
        return false;
      if (teamStatusFilter === 'active' && team.status !== 'active') return false;
      if (teamStatusFilter === 'forming' && team.status !== 'forming') return false;

      if (!teamSearchQuery.trim()) return true;
      const q = teamSearchQuery.toLowerCase().trim();
      const teamNameMatch = team.name?.toLowerCase().includes(q);
      const repoMatch = team.repoUrl?.toLowerCase().includes(q);
      const evaluatorMatch = team.assignedTeacherId?.name?.toLowerCase().includes(q);
      const memberMatch = team.members?.some(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.githubUsername?.toLowerCase().includes(q)
      );

      return Boolean(teamNameMatch || repoMatch || evaluatorMatch || memberMatch);
    });
  }, [teamsData?.teams, teamSearchQuery, teamStatusFilter, activeBatch?.minTeamSize]);

  const deleteCohortMutation = useMutation({
    mutationFn: async (cohortId) => (await api.delete(`/admin/cohorts/${cohortId}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
    }
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId) => (await api.delete(`/admin/batches/${batchId}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
      setSelectedBatchId(null);
    }
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId) => (await api.delete(`/admin/milestones/${milestoneId}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-milestones'] });
    }
  });

  const reconcileScoresMutation = useMutation({
    mutationFn: async (batchId) => (await api.post('/admin/milestones/reconcile', { batchId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-milestones'] });
      alert('Student milestone scores reconciled successfully!');
    }
  });

  const dissolveTeamMutation = useMutation({
    mutationFn: async (teamId) => (await api.delete(`/admin/teams/${teamId}/dissolve`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
    }
  });

  const overrideStatusMutation = useMutation({
    mutationFn: async ({ teamId, status }) => (await api.patch(`/admin/teams/${teamId}/status`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
    }
  });

  const setActiveBatchMutation = useMutation({
    mutationFn: async ({ batchId, isActive }) => (await api.patch(`/batches/${batchId}/active`, { isActive })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-batches'] });
    }
  });

  // 1. COHORTS VIEW
  if (!selectedCohortId) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">Academic Cohorts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage cohorts, track semesters, and oversee student allocations.</p>
          </div>
          <button
            onClick={() => {
              setEditingCohort(null);
              setShowCohortModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">New Cohort</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cohortsData?.cohorts?.map((c) => (
            <div
              key={c.id || c._id}
              onClick={() => {
                setSelectedCohortId(c.id || c._id);
                setSelectedBatchId(null);
              }}
              className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group flex flex-col relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                  <BookOpen size={20} />
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border ${
                      c.isActive
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <button
                    onClick={() => {
                      setEditingCohort(c);
                      setShowCohortModal(true);
                    }}
                    title="Edit Cohort"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to permanently delete cohort '${c.name}'?\n\nWARNING: All associated semesters, teams, and milestone templates will be cascade deleted!`
                        )
                      ) {
                        deleteCohortMutation.mutate(c.id || c._id);
                      }
                    }}
                    title="Delete Cohort"
                    className="p-1.5 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-4">{c.name}</h3>

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-end">
                <div className="text-primary text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                  View Semesters <MoveRight size={14} />
                </div>
              </div>
            </div>
          ))}

          {(!cohortsData?.cohorts || cohortsData.cohorts.length === 0) && (
            <div className="col-span-full py-16 text-center bg-card border border-border rounded-2xl shadow-sm">
              <p className="text-sm font-bold text-foreground">No cohorts created yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create an academic cohort to begin setting up semesters and teams.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. BATCHES / SEMESTERS VIEW
  if (!selectedBatchId) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <button
            onClick={() => setSelectedCohortId(null)}
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Cohorts
          </button>
          <span>/</span>
          <span className="text-foreground">{activeCohort?.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">{activeCohort?.name} Semesters</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Semesters, team size constraints, and grading milestones.</p>
          </div>
          <button
            onClick={() => {
              setEditingBatch(null);
              setShowBatchModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">New Semester</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cohortBatches.map((b) => (
            <div
              key={b.id || b._id}
              onClick={() => {
                setSelectedBatchId(b.id || b._id);
                setBatchDetailTab('milestones');
              }}
              className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                  <BookOpen size={20} />
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => {
                      setActiveBatchMutation.mutate({ batchId: b.id || b._id, isActive: !b.isActive });
                    }}
                    disabled={setActiveBatchMutation.isPending}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      b.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        b.isActive ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => {
                      setEditingBatch(b);
                      setShowBatchModal(true);
                    }}
                    title="Edit Semester"
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to permanently delete semester '${b.name}'?\n\nWARNING: All teams and milestones in this semester will be permanently deleted!`
                        )
                      ) {
                        deleteBatchMutation.mutate(b.id || b._id);
                      }
                    }}
                    title="Delete Semester"
                    className="p-1 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{b.name}</h3>
              <p className="text-sm text-muted-foreground font-medium mb-6">
                Team Size: {b.minTeamSize}-{b.maxTeamSize} Members
              </p>

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-end">
                <div className="text-primary text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Manage <MoveRight size={14} />
                </div>
              </div>
            </div>
          ))}

          {cohortBatches.length === 0 && (
            <div className="col-span-full py-16 text-center bg-card border border-border rounded-2xl shadow-sm">
              <p className="text-sm font-bold text-foreground">No semesters created for this cohort yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add a semester to configure milestone requirements and teams.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleExportBatchRoster = () => {
    if (!teamsData?.teams || teamsData.teams.length === 0) {
      alert('No teams available to export for this semester.');
      return;
    }
    const headers = ['Team Name', 'Team Status', 'Evaluator', 'Member Name', 'Member Email', 'GitHub Username'];
    const rows = [];
    teamsData.teams.forEach((t) => {
      const evaluatorName = t.assignedTeacherId?.name || 'Unassigned';
      if (!t.members || t.members.length === 0) {
        rows.push([t.name, t.status, evaluatorName, 'No Members', '', '']);
      } else {
        t.members.forEach((m) => {
          rows.push([t.name, t.status, evaluatorName, m.name || '', m.email || '', m.githubUsername || '']);
        });
      }
    });

    const filename = `${activeBatch?.name || 'semester'}_teams_roster_${new Date().toISOString().split('T')[0]}`;
    downloadCsv(filename, headers, rows);
  };

  // 3. BATCH DETAIL (MILESTONES & TEAMS)
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <button
          onClick={() => setSelectedCohortId(null)}
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Cohorts
        </button>
        <span>/</span>
        <button
          onClick={() => setSelectedBatchId(null)}
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          {activeCohort?.name}
        </button>
        <span>/</span>
        <span className="text-foreground">{activeBatch?.name}</span>
      </div>

      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">{activeBatch?.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Team limits: {activeBatch?.minTeamSize} to {activeBatch?.maxTeamSize} members | Academic Cohort:{' '}
            {activeCohort?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportBatchRoster}
            className="px-3 py-2 rounded-xl bg-background hover:bg-muted text-xs font-bold text-foreground border border-border transition-colors flex items-center gap-1.5 shadow-sm"
            title="Export Batch Roster & Teams CSV"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export Roster CSV</span>
          </button>

          <div className="flex items-center bg-muted p-1 rounded-xl">
            <button
              onClick={() => setBatchDetailTab('milestones')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                batchDetailTab === 'milestones'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Milestones
            </button>
            <button
              onClick={() => setBatchDetailTab('teams')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                batchDetailTab === 'teams'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Team Oversight
            </button>
          </div>
        </div>
      </div>

      {batchDetailTab === 'milestones' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BookOpen size={18} className="text-primary" /> Milestone Templates
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => reconcileScoresMutation.mutate(activeBatchId)}
                className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border border-border flex items-center gap-1.5 transition"
                title="Idempotent Score Reconciliation"
              >
                <RefreshCw size={14} /> Reconcile
              </button>
              <button
                onClick={() => {
                  setEditingMilestone(null);
                  setShowMilestoneModal(true);
                }}
                className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus size={14} /> Add Milestone
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {milestonesData?.milestones?.map((m) => (
              <div
                key={m.id || m._id}
                className="p-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
                      Milestone {m.order}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground">{m.maxScore} Marks</span>
                      <button
                        onClick={() => {
                          setEditingMilestone(m);
                          setShowMilestoneModal(true);
                        }}
                        title="Edit Milestone"
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete milestone '${m.title}'?`)) {
                            deleteMilestoneMutation.mutate(m.id || m._id);
                          }
                        }}
                        title="Delete Milestone"
                        className="p-1 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-2">{m.title}</h4>
                  {m.rubric && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{m.rubric}</p>}

                  {/* Deadline countdown */}
                  {(() => {
                    const dl = getMilestoneDeadlineInfo(m.dueDate);
                    if (!dl) {
                      return (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-2">
                          <Calendar size={12} className="opacity-60" />
                          <span>No deadline set</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${dl.badgeClass}`}>
                          <Clock size={11} />
                          {dl.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Due {dl.dateText}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
                  {m.requiresExternalReview && (
                    <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md border border-amber-500/20">
                      EXTERNAL REVIEW
                    </span>
                  )}
                  {m.requiresDeliverable && (
                    <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                      DELIVERABLE MANDATORY
                    </span>
                  )}
                </div>
              </div>
            ))}

            {(!milestonesData?.milestones || milestonesData.milestones.length === 0) && (
              <div className="col-span-full py-12 text-center bg-muted/20 border border-border rounded-xl">
                <p className="text-xs font-bold text-foreground">No milestone templates defined yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click 'Add Milestone' above to create evaluation templates.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {batchDetailTab === 'teams' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-border gap-4 mb-6">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Users size={18} className="text-primary" /> Team Oversight & Allocation
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total Teams: {teamsData?.teams?.length || 0} | Manage formations, randomize unassigned students, and balance evaluator loads.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAutoFormModal(true)}
                className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-primary/20"
                title="Randomly group remaining students into teams"
              >
                <Shuffle size={14} /> Auto-Form Teams
              </button>

              <button
                onClick={() => setShowAutoAssignModal(true)}
                className="px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-blue-500/20"
                title="Equally and randomly assign teams to available teachers"
              >
                <UserCheck size={14} /> Auto-Assign Faculty
              </button>

              <button
                onClick={() => {
                  setEditingTeam(null);
                  setShowTeamModal(true);
                }}
                className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-border"
              >
                <Plus size={14} /> Add Team
              </button>

              <button
                onClick={() => setShowMoveMemberModal(true)}
                className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm whitespace-nowrap"
              >
                <MoveRight size={14} /> Move Member
              </button>
            </div>
          </div>

          {/* Live Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 bg-muted/20 p-3 rounded-2xl border border-border">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                placeholder="Search by team, member, email, @github, or evaluator..."
                className="w-full bg-background border border-border rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              />
              {teamSearchQuery && (
                <button
                  onClick={() => setTeamSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'all', label: 'All', count: teamsData?.teams?.length || 0 },
                {
                  key: 'needs_evaluator',
                  label: 'Needs Evaluator',
                  count: (teamsData?.teams || []).filter((t) => !t.assignedTeacherId).length
                },
                {
                  key: 'under_capacity',
                  label: 'Under Capacity',
                  count: (teamsData?.teams || []).filter(
                    (t) => activeBatch?.minTeamSize && (t.members?.length || 0) < activeBatch.minTeamSize
                  ).length
                },
                {
                  key: 'active',
                  label: 'Active',
                  count: (teamsData?.teams || []).filter((t) => t.status === 'active').length
                },
                {
                  key: 'forming',
                  label: 'Forming',
                  count: (teamsData?.teams || []).filter((t) => t.status === 'forming').length
                }
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setTeamStatusFilter(pill.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    teamStatusFilter === pill.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      teamStatusFilter === pill.key ? 'bg-primary-foreground/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredTeams.map((team) => (
              <div
                key={team.id || team._id}
                className="p-4 rounded-xl bg-background border border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-colors hover:border-border/80"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="font-bold text-foreground text-sm">{team.name}</h4>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                        team.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : team.status === 'forming'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}
                    >
                      {team.status}
                    </span>

                    {activeBatch?.minTeamSize && team.members.length < activeBatch.minTeamSize && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        {team.members.length}/{activeBatch.minTeamSize} Min Members
                      </span>
                    )}

                    {!team.assignedTeacherId ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        Needs Evaluator
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-muted-foreground">
                        Evaluator: {team.assignedTeacherId?.name || 'Assigned'}
                      </span>
                    )}

                    {team.repoUrl && (
                      <a
                        href={team.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary underline truncate max-w-[200px]"
                      >
                        {team.repoUrl}
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mr-1">
                      Members ({team.members?.length || 0}):
                    </span>
                    {team.members?.map((m) => (
                      <span
                        key={m.id || m._id}
                        className="text-xs bg-muted text-foreground px-2.5 py-1 rounded-md border border-border font-medium flex items-center gap-1"
                      >
                        {m.name} <span className="text-muted-foreground text-[10px]">@{m.githubUsername || 'unlinked'}</span>
                      </span>
                    ))}
                    {(!team.members || team.members.length === 0) && (
                      <span className="text-xs italic text-muted-foreground">No students assigned yet</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 xl:pt-0 border-t xl:border-0 border-border">
                  <select
                    value={team.status}
                    onChange={(e) =>
                      overrideStatusMutation.mutate({ teamId: team.id || team._id, status: e.target.value })
                    }
                    className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="forming">Status: forming</option>
                    <option value="active">Status: active</option>
                    <option value="completed">Status: completed</option>
                  </select>

                  <button
                    onClick={() => {
                      setEditingTeam(team);
                      setShowTeamModal(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-background hover:bg-muted text-xs font-bold text-foreground border border-border transition-colors flex items-center gap-1"
                    title="Edit Team Name / Repo URL"
                  >
                    <Edit2 size={12} /> Edit
                  </button>

                  <button
                    onClick={() => {
                      setAssignTeamId(team.id || team._id);
                      setSelectedTeacherId(team.assignedTeacherId?.id || team.assignedTeacherId || '');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-background hover:bg-muted text-xs font-bold text-foreground border border-border transition-colors"
                  >
                    Assign Teacher
                  </button>

                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to dissolve '${team.name}'? Affected member score/metric links will be set to null cleanly.`
                        )
                      ) {
                        dissolveTeamMutation.mutate(team.id || team._id);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-xs font-bold text-destructive border border-destructive/20 flex items-center gap-1 transition-colors"
                  >
                    <XCircle size={13} /> Dissolve
                  </button>
                </div>
              </div>
            ))}

            {filteredTeams.length === 0 && (
              <div className="py-12 text-center bg-muted/20 border border-border rounded-xl">
                {teamsData?.teams && teamsData.teams.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground">No teams match your search or filter</p>
                    <p className="text-xs text-muted-foreground">
                      Try searching for a different keyword or resetting the category filter.
                    </p>
                    <button
                      onClick={() => {
                        setTeamSearchQuery('');
                        setTeamStatusFilter('all');
                      }}
                      className="mt-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/20 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-foreground">No teams formed in this semester yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Click 'Auto-Form Teams' above to randomly assemble unassigned students into teams.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
