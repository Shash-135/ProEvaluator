import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import {
  Users,
  UserPlus,
  Check,
  X,
  BookOpen,
  Github,
  Award,
  Clock,
  MessageSquare,
  ChevronRight,
  BarChart2
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [toStudentId, setToStudentId] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');

  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Fetch batches for user's cohort
  const cohortId = user?.cohortId?._id || user?.cohortId;
  const { data: batchesData } = useQuery({
    queryKey: ['student-batches', cohortId],
    queryFn: async () => (await api.get(`/batches?cohortId=${cohortId}`)).data,
    enabled: !!cohortId
  });

  useEffect(() => {
    if (batchesData?.batches?.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batchesData.batches[0]._id || batchesData.batches[0].id);
    }
  }, [batchesData, selectedBatchId]);

  // Fetch Student's Team for the selected batch
  const { data: teamsData } = useQuery({
    queryKey: ['student-team', selectedBatchId],
    queryFn: async () => (await api.get(`/teams?batchId=${selectedBatchId}`)).data,
    enabled: !!selectedBatchId
  });

  const team = teamsData?.teams?.[0];

  // Fetch Pending Join Requests
  const { data: requestsData } = useQuery({
    queryKey: ['join-requests'],
    queryFn: async () => (await api.get('/join-requests')).data
  });

  // Fetch Roster for sending invitations in the current batch
  const { data: rosterData } = useQuery({
    queryKey: ['student-roster', selectedBatchId],
    queryFn: async () => (await api.get(`/batches/${selectedBatchId}/roster`)).data,
    enabled: !!selectedBatchId
  });

  // Fetch Student Milestone Scores for current batch
  const { data: scoresData } = useQuery({
    queryKey: ['student-scores', user?.id, selectedBatchId],
    queryFn: async () => (await api.get(`/milestones/students/${user?.id}?batchId=${selectedBatchId}`)).data,
    enabled: !!user?.id && !!selectedBatchId
  });

  // Fetch GitHub Metrics
  const { data: metricsData } = useQuery({
    queryKey: ['student-metrics', team?._id],
    queryFn: async () => (await api.get(`/teams/${team._id}/metrics`)).data,
    enabled: !!team?._id
  });

  // Send Join Request Mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/join-requests', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      setToStudentId('');
    }
  });

  // Accept Request Mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async (id) => (await api.patch(`/join-requests/${id}/accept`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['student-team'] });
    }
  });

  // Reject Request Mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async (id) => (await api.patch(`/join-requests/${id}/reject`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
    }
  });

  // Update Repo URL Mutation
  const updateRepoMutation = useMutation({
    mutationFn: async (repoUrl) => (await api.patch(`/teams/${team._id}/repo`, { repoUrl })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-team'] });
    }
  });

  const studentScore = scoresData?.studentScore;
  const myMetrics = metricsData?.metrics?.students?.find((s) => s.studentId === user?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Top Header & Progress */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs mb-3 border border-primary/20">
            <BookOpen size={14} /> Student Workspace
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Project Dashboard</h2>
          
          {batchesData?.batches?.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Semester Context:</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-background border border-border rounded-xl px-4 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
              >
                {batchesData.batches.map(b => (
                  <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {studentScore?.progressSummary && (
          <div className="flex bg-card border border-border rounded-2xl p-1 shadow-sm">
            <div className="px-6 py-3 flex flex-col justify-center">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Progress</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-primary">{studentScore.progressSummary.percentComplete}%</span>
              </div>
            </div>
            <div className="w-px bg-border my-2"></div>
            <div className="px-6 py-3 flex flex-col justify-center">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">{studentScore.progressSummary.totalScore}</span>
                <span className="text-sm font-semibold text-muted-foreground">pts</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Team & Metrics) - col-span-4 on large screens */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Team Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Users size={20} />
                </div>
                <h3 className="font-bold text-lg text-foreground tracking-tight">My Team</h3>
              </div>
              {team && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  team.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {team.status.toUpperCase()}
                </span>
              )}
            </div>

            {team ? (
              <div className="space-y-5 relative z-10">
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Team Name</div>
                  <div className="text-base font-bold text-foreground mt-1">{team.name}</div>
                  <div className="text-xs text-primary font-medium mt-1">
                    Evaluator: {team.assignedTeacherId ? team.assignedTeacherId.name : 'Awaiting Assignment'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Members</label>
                  <div className="space-y-2">
                    {team.members.map((m) => (
                      <div key={m._id} className="p-3 rounded-xl bg-background border border-border flex items-center justify-between hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                             {m.name.charAt(0)}
                           </div>
                           <span className="font-semibold text-sm text-foreground">{m.name}</span>
                        </div>
                        <span className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded-md">@{m.githubUsername || 'unlinked'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">GitHub Repository</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue={team.repoUrl || ''}
                      onChange={(e) => setRepoUrlInput(e.target.value)}
                      placeholder="org/repo"
                      className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    />
                    <button
                      onClick={() => updateRepoMutation.mutate(repoUrlInput)}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-xl transition-colors shadow-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 relative z-10">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                   <Users size={24} />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No Team Assigned</p>
                <p className="text-xs text-muted-foreground mb-6">Create a team by inviting a classmate.</p>
                
                <div className="space-y-3 text-left bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invite Classmate</label>
                  <select
                    value={toStudentId}
                    onChange={(e) => setToStudentId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Select student --</option>
                    {rosterData?.students
                      ?.filter((s) => s._id !== user?.id)
                      .map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.githubUsername || s.email})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => sendRequestMutation.mutate({ toStudentId, batchId: selectedBatchId })}
                    disabled={!toStudentId}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus size={16} /> Send Invitation
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          {requestsData?.incoming && requestsData.incoming.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm border-l-4 border-l-amber-500">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <Clock size={16} className="text-amber-500" /> Pending Invitations
              </h3>
              <div className="space-y-3">
                {requestsData.incoming.map((req) => (
                  <div key={req._id} className="p-3 rounded-xl bg-background border border-border flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-foreground">{req.fromStudent?.name}</div>
                      <div className="text-[11px] text-muted-foreground">@{req.fromStudent?.githubUsername}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptRequestMutation.mutate(req._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                        title="Accept"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => rejectRequestMutation.mutate(req._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Reject"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal GitHub Stats */}
          {myMetrics && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Github size={20} />
                </div>
                <h3 className="font-bold text-lg text-foreground tracking-tight">My Contributions</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-background border border-border text-center flex flex-col justify-center items-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Commits</span>
                  <span className="font-black text-foreground text-xl">{myMetrics.commitCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center flex flex-col justify-center items-center">
                  <span className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-wider mb-1">Additions</span>
                  <span className="font-black text-emerald-600 text-xl">+{myMetrics.linesAdded}</span>
                </div>
                <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-center flex flex-col justify-center items-center">
                  <span className="text-[10px] text-destructive/70 font-bold uppercase tracking-wider mb-1">Deletions</span>
                  <span className="font-black text-destructive text-xl">-{myMetrics.linesDeleted}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Milestone Timeline - col-span-8 on large screens */}
        <div className="lg:col-span-8">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Award size={20} />
                </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">Milestone Tracker</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sequential progress and faculty evaluations
                </p>
              </div>
            </div>

            <div className="relative border-l-2 border-muted ml-4 space-y-8 pb-4">
              {studentScore?.scores?.map((item) => {
                const mObj = item.milestoneId || {};
                const isGraded = item.status === 'graded';

                return (
                  <div key={item.order} className="relative pl-8">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border-4 border-card flex items-center justify-center text-[10px] font-black shadow-sm ${
                      isGraded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.order}
                    </div>

                    <div className={`p-5 rounded-2xl border transition-all duration-200 ${
                      isGraded
                        ? 'bg-primary/5 border-primary/20 shadow-sm'
                        : 'bg-background border-border hover:border-border/80'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        
                        <div>
                          <h4 className="font-bold text-base text-foreground mb-1">{mObj.title || `Milestone ${item.order}`}</h4>
                          {mObj.dueDate && (
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                              <Clock size={12} />
                              Due: {new Date(mObj.dueDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 bg-background px-4 py-2 rounded-xl border border-border shadow-sm">
                          {isGraded ? (
                            <div className="text-center">
                              <span className="text-xl font-black text-foreground">{item.score}</span>
                              <span className="text-sm font-semibold text-muted-foreground"> / {item.maxScore}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Pending Evaluation
                            </span>
                          )}
                        </div>
                      </div>

                      {item.comments && (
                        <div className="mt-4 p-4 rounded-xl bg-background border border-border text-sm text-foreground flex items-start gap-3">
                          <MessageSquare size={16} className="text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wider mb-1">Faculty Feedback</span>
                            <p className="leading-relaxed">{item.comments}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
