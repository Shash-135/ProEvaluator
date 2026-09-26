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
  Sparkles,
  GitBranch,
  CheckCircle2
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

  const completedMilestones = studentScore?.scores?.filter(s => s.status === 'graded').length || 0;
  const totalMilestones = studentScore?.scores?.length || 0;

  return (
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
              <BookOpen size={12} /> Student Workspace
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Project Overview</h1>
          
          {batchesData?.batches?.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground font-semibold">
              <span>Semester:</span>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-sm"
              >
                {batchesData.batches.map(b => (
                  <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {studentScore?.progressSummary && (
          <div className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="space-y-1 pr-4 border-r border-border">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Completion</div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-primary">{studentScore.progressSummary.percentComplete}%</span>
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(studentScore.progressSummary.percentComplete, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-1 pl-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Score</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">{studentScore.progressSummary.totalScore}</span>
                <span className="text-xs font-bold text-muted-foreground">pts</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Team & Stats (col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Team Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-foreground leading-snug">My Team</h2>
                  <p className="text-xs text-muted-foreground">Team status & roster</p>
                </div>
              </div>

              {team && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                  team.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {team.status}
                </span>
              )}
            </div>

            {team ? (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Team Name</span>
                    <span className="text-base font-bold text-foreground mt-0.5 block">{team.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Evaluator</span>
                    <span className="text-xs font-semibold text-primary mt-0.5 block">
                      {team.assignedTeacherId?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Members ({team.members.length})</div>
                  <div className="space-y-2">
                    {team.members.map((m) => (
                      <div key={m._id} className="p-3 rounded-xl bg-background border border-border flex items-center justify-between hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-foreground block">{m.name}</span>
                            {m._id === user?.id && (
                              <span className="text-[10px] text-primary font-semibold">You</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                          @{m.githubUsername || 'unlinked'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GitHub Repository Link */}
                <div className="pt-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">GitHub Repository</div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                        <GitBranch size={14} />
                      </div>
                      <input
                        type="text"
                        defaultValue={team.repoUrl || ''}
                        onChange={(e) => setRepoUrlInput(e.target.value)}
                        placeholder="owner/repository"
                        className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={() => updateRepoMutation.mutate(repoUrlInput)}
                      disabled={updateRepoMutation.isPending}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs font-bold text-foreground">You are not in a team yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Form a team with a classmate to start milestone tracking.</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invite Classmate</label>
                  <select
                    value={toStudentId}
                    onChange={(e) => setToStudentId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Choose classmate from roster --</option>
                    {rosterData?.students
                      ?.filter((s) => s._id !== user?.id)
                      .map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.githubUsername ? `@${s.githubUsername}` : s.email})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => sendRequestMutation.mutate({ toStudentId, batchId: selectedBatchId })}
                    disabled={!toStudentId || sendRequestMutation.isPending}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  >
                    <UserPlus size={14} /> Send Team Invite
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Invitations Alert */}
          {requestsData?.incoming && requestsData.incoming.length > 0 && (
            <div className="bg-card border border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-700">Pending Invitations ({requestsData.incoming.length})</h3>
              </div>

              <div className="space-y-2">
                {requestsData.incoming.map((req) => (
                  <div key={req._id} className="p-3 rounded-xl bg-background border border-border flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-foreground block">{req.fromStudent?.name}</span>
                      <span className="text-[11px] text-muted-foreground">@{req.fromStudent?.githubUsername || 'unlinked'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => acceptRequestMutation.mutate(req._id)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                        title="Accept"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => rejectRequestMutation.mutate(req._id)}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Decline"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal GitHub Contributions */}
          {myMetrics && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Github size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">My GitHub Stats</h3>
                    <p className="text-[10px] text-muted-foreground">Synchronized repository contributions</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Commits</span>
                  <span className="font-black text-foreground text-xl block">{myMetrics.commitCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-wider block mb-1">Added</span>
                  <span className="font-black text-emerald-600 text-xl block">+{myMetrics.linesAdded}</span>
                </div>
                <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                  <span className="text-[10px] text-destructive/70 font-bold uppercase tracking-wider block mb-1">Deleted</span>
                  <span className="font-black text-destructive text-xl block">-{myMetrics.linesDeleted}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Milestone Timeline (col-span-7) */}
        <div className="lg:col-span-7">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">Milestone Roadmap</h2>
                  <p className="text-xs text-muted-foreground">Evaluation status and faculty feedback</p>
                </div>
              </div>

              {totalMilestones > 0 && (
                <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {completedMilestones} of {totalMilestones} Completed
                </span>
              )}
            </div>

            {(!studentScore?.scores || studentScore.scores.length === 0) ? (
              <div className="py-12 text-center text-muted-foreground bg-muted/20 border border-border rounded-xl">
                <Sparkles size={24} className="mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-xs font-bold text-foreground">No Milestones Assigned</p>
                <p className="text-xs text-muted-foreground mt-1">Milestones will appear here once configured by the department admin.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-muted ml-3.5 space-y-6 pb-2">
                {studentScore.scores.map((item) => {
                  const mObj = item.milestoneId || {};
                  const isGraded = item.status === 'graded';

                  return (
                    <div key={item.order} className="relative pl-7">
                      {/* Node Bullet */}
                      <div className={`absolute -left-[15px] top-1 w-7 h-7 rounded-full border-4 border-card flex items-center justify-center text-[10px] font-black shadow-sm ${
                        isGraded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isGraded ? <Check size={12} strokeWidth={3} /> : item.order}
                      </div>

                      <div className={`p-5 rounded-2xl border transition-all ${
                        isGraded
                          ? 'bg-primary/5 border-primary/20 shadow-sm'
                          : 'bg-background border-border'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Milestone {item.order}
                              </span>
                              {mObj.requiresExternalReview && (
                                <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20">
                                  External Review
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-base text-foreground">{mObj.title || `Milestone ${item.order}`}</h4>
                            {mObj.dueDate && (
                              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1.5">
                                <Clock size={12} />
                                Due {new Date(mObj.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isGraded ? (
                              <div className="bg-card px-3.5 py-1.5 rounded-xl border border-primary/20 text-center shadow-sm">
                                <span className="text-lg font-black text-primary">{item.score}</span>
                                <span className="text-xs font-semibold text-muted-foreground"> / {item.maxScore}</span>
                              </div>
                            ) : (
                              <span className="inline-block text-[11px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                                In Progress
                              </span>
                            )}
                          </div>
                        </div>

                        {item.comments && (
                          <div className="mt-4 p-3.5 rounded-xl bg-card border border-border text-xs text-foreground flex items-start gap-2.5">
                            <MessageSquare size={14} className="text-primary shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider block mb-0.5">Faculty Feedback</span>
                              <p className="leading-relaxed text-foreground">{item.comments}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
