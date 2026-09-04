import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { BookOpen, Plus, ArrowLeft, RefreshCw, Users, MoveRight, XCircle } from 'lucide-react';
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
  setShowCohortModal,
  setShowMilestoneModal,
  setShowMoveMemberModal,
  setAssignTeamId,
  setSelectedTeacherId
}) => {
  const queryClient = useQueryClient();
  const activeCohort = cohortsData?.cohorts?.find(c => (c.id || c._id) === selectedCohortId);
  const activeBatch = batchesData?.batches?.find((b) => (b.id || b._id) === selectedBatchId);
  const activeBatchId = selectedBatchId;

  const cohortBatches = batchesData?.batches?.filter(b => b.cohortId === selectedCohortId) || [];

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

  if (!selectedCohortId) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">Academic Cohorts</h2>
          </div>
          <button
            onClick={() => setShowCohortModal && setShowCohortModal(true)}
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
              className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                   <BookOpen size={20} />
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border ${
                  c.isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{c.name}</h3>
              <p className="text-sm text-muted-foreground font-medium mb-6">Manage Semesters & Teams</p>
              
              <div className="mt-auto pt-4 border-t border-border flex items-center justify-end">
                 <div className="text-primary text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                   View Semesters <MoveRight size={14} />
                 </div>
              </div>
            </div>
          ))}

          {(!cohortsData?.cohorts || cohortsData.cohorts.length === 0) && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
               <p className="text-sm font-medium">No cohorts created yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedBatchId) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <button onClick={() => setSelectedCohortId(null)} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft size={16} /> Cohorts
          </button>
          <span>/</span>
          <span className="text-foreground">{activeCohort?.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">{activeCohort?.name} Semesters</h2>
          </div>
          <button
            onClick={() => setShowBatchModal(true)}
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
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
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{b.name}</h3>
              <p className="text-sm text-muted-foreground font-medium mb-6">Team Size: {b.minTeamSize}-{b.maxTeamSize}</p>
              
              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                 <div className="text-xs font-semibold text-muted-foreground">
                   Manage Milestones & Teams
                 </div>
                 <div className="text-primary text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                   Manage <MoveRight size={14} />
                 </div>
              </div>
            </div>
          ))}

          {cohortBatches.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
               <p className="text-sm font-medium">No semesters created for this cohort yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
       <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <button onClick={() => setSelectedCohortId(null)} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft size={16} /> Cohorts
          </button>
          <span>/</span>
          <button onClick={() => setSelectedBatchId(null)} className="hover:text-foreground transition-colors flex items-center gap-1">
            {activeCohort?.name}
          </button>
          <span>/</span>
          <span className="text-foreground">{activeBatch?.name}</span>
       </div>

       <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-foreground">{activeBatch?.name}</h2>
          </div>
          <div className="flex items-center bg-muted p-1 rounded-xl">
            <button
              onClick={() => setBatchDetailTab('milestones')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${batchDetailTab === 'milestones' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Milestones
            </button>
            <button
              onClick={() => setBatchDetailTab('teams')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${batchDetailTab === 'teams' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Team Oversight
            </button>
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
                  onClick={() => setShowMilestoneModal(true)}
                  className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus size={14} /> Add Milestone
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {milestonesData?.milestones?.map((m) => (
                <div key={m.id || m._id} className="p-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
                      Milestone {m.order}
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground">{m.maxScore} Marks</span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-2">{m.title}</h4>
                  {m.rubric && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.rubric}</p>}
                  {m.requiresExternalReview && (
                    <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 px-2 py-1 rounded-md border border-amber-500/20 inline-block mt-2">
                      REQUIRES EXTERNAL REVIEW
                    </span>
                  )}
                </div>
              ))}

              {(!milestonesData?.milestones || milestonesData.milestones.length === 0) && (
                <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <p className="text-xs font-medium">No milestone templates defined for this batch yet.</p>
                </div>
              )}
            </div>
         </div>
       )}

       {batchDetailTab === 'teams' && (
         <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4 mb-6">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Users size={18} className="text-primary" /> Team Oversight
                </h3>
              </div>

              <button
                onClick={() => setShowMoveMemberModal(true)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm whitespace-nowrap"
              >
                <MoveRight size={14} /> Move Team Member
              </button>
            </div>

            <div className="space-y-4">
              {teamsData?.teams?.map((team) => (
                <div key={team.id || team._id} className="p-4 rounded-xl bg-background border border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-colors hover:border-border/80">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-foreground text-sm">{team.name}</h4>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                        team.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : team.status === 'forming'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {team.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mr-1">Members:</span>
                      {team.members.map((m) => (
                        <span key={m.id || m._id} className="text-xs bg-muted text-foreground px-2.5 py-1 rounded-md border border-border font-medium flex items-center gap-1">
                          {m.name} <span className="text-muted-foreground text-[10px]">@{m.githubUsername || 'unlinked'}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 xl:pt-0 border-t xl:border-0 border-border">
                    <select
                      value={team.status}
                      onChange={(e) => overrideStatusMutation.mutate({ teamId: team.id || team._id, status: e.target.value })}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="forming">Status: forming</option>
                      <option value="active">Status: active</option>
                      <option value="completed">Status: completed</option>
                    </select>

                    <button
                      onClick={() => {
                        setAssignTeamId(team.id || team._id);
                        setSelectedTeacherId(team.assignedTeacherId?.id || team.assignedTeacherId || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-background hover:bg-muted text-xs font-bold text-foreground border border-border transition-colors"
                    >
                      Assign Teacher
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to dissolve '${team.name}'? Affected member score/metric links will be set to null cleanly.`)) {
                          dissolveTeamMutation.mutate(team.id || team._id);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-xs font-bold text-destructive border border-destructive/20 flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle size={14} /> Dissolve
                    </button>
                  </div>
                </div>
              ))}

              {(!teamsData?.teams || teamsData.teams.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed border-border rounded-xl">No teams formed in this batch yet.</p>
              )}
            </div>
         </div>
       )}
    </div>
  );
};
