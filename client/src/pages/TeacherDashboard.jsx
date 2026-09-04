import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useUiStore } from '../store/useUiStore';
import { GradeModal } from '../components/GradeModal';
import {
  Users,
  Award,
  Github,
  RefreshCw,
  Clock,
  ExternalLink,
  Code2,
  ChevronDown,
  LayoutDashboard,
  ArrowLeft,
  BookOpen
} from 'lucide-react';

export const TeacherDashboard = () => {
  const { openGradeModal } = useUiStore();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [forceSyncing, setForceSyncing] = useState(false);

  // Fetch Teacher's Assigned Teams
  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ['teacher-teams'],
    queryFn: async () => (await api.get('/teacher/teams')).data
  });

  const teams = teamsData?.teams || [];
  const activeTeamId = selectedTeamId;

  // Fetch Team Milestone Summary Grid
  const { data: summaryData } = useQuery({
    queryKey: ['team-summary', activeTeamId],
    queryFn: async () => (await api.get(`/teacher/teams/${activeTeamId}`)).data,
    enabled: !!activeTeamId
  });

  // Fetch GitHub Metrics
  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ['team-metrics', activeTeamId],
    queryFn: async () => (await api.get(`/teacher/teams/${activeTeamId}/metrics`)).data,
    enabled: !!activeTeamId
  });

  const handleForceSync = async () => {
    setForceSyncing(true);
    try {
      await api.get(`/teacher/teams/${activeTeamId}/metrics?force=true`);
      await refetchMetrics();
    } catch (err) {
      console.error('Failed to sync metrics:', err);
    } finally {
      setForceSyncing(false);
    }
  };

  const activeTeam = teams.find((t) => t._id === activeTeamId);
  const metrics = metricsData?.metrics;

  const groupedTeams = teams.reduce((acc, team) => {
    const cohortName = team.batch?.cohort?.name || 'Unknown Cohort';
    const batchName = team.batch?.name || 'Unknown Semester';
    const groupName = `${cohortName} - ${batchName}`;
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(team);
    return acc;
  }, {});

  return (
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-border gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 font-semibold text-xs mb-3 border border-blue-500/20">
            <LayoutDashboard size={14} /> Faculty Evaluation Portal
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
            {activeTeamId ? `Evaluating: ${activeTeam?.name}` : selectedGroup ? `Teams in ${selectedGroup}` : 'Project Milestone Evaluation'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {activeTeamId ? 'Review student contributions and grade project milestones.' : selectedGroup ? 'Select a team to evaluate.' : 'Select a semester block to view assigned teams.'}
          </p>
        </div>

        {selectedGroup && !activeTeamId && (
          <button
            onClick={() => setSelectedGroup('')}
            className="px-4 py-2.5 rounded-xl bg-background border border-border hover:bg-muted text-foreground font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Semesters
          </button>
        )}

        {activeTeamId && (
          <button
            onClick={() => setSelectedTeamId('')}
            className="px-4 py-2.5 rounded-xl bg-background border border-border hover:bg-muted text-foreground font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Teams
          </button>
        )}
      </div>

      {teams.length === 0 && !loadingTeams && (
        <div className="py-20 text-center bg-card border border-border rounded-2xl shadow-sm max-w-2xl mx-auto mt-12">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No Teams Assigned Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You do not currently have any student teams assigned to you. An administrator will allocate teams shortly.
          </p>
        </div>
      )}

      {!activeTeamId && !selectedGroup && teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {Object.entries(groupedTeams).map(([groupName, groupTeams]) => (
            <div
              key={groupName}
              onClick={() => setSelectedGroup(groupName)}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="p-3 bg-primary/10 text-primary rounded-xl w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{groupName}</h3>
              <p className="text-sm text-muted-foreground mt-auto">
                {groupTeams.length} Assigned {groupTeams.length === 1 ? 'Team' : 'Teams'}
              </p>
            </div>
          ))}
        </div>
      )}

      {!activeTeamId && selectedGroup && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-right-4 duration-300">
          {groupedTeams[selectedGroup]?.map((team) => (
            <div
              key={team._id}
              onClick={() => setSelectedTeamId(team._id)}
              className="group bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all rounded-2xl p-6 cursor-pointer flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{team.name}</h4>
                <span className={`text-[9px] font-black px-2 py-1 rounded-md border uppercase tracking-wider ${
                  team.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : team.status === 'forming'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}>
                  {team.status}
                </span>
              </div>
              
              <div className="mt-auto">
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Team Members</div>
                <div className="flex flex-wrap gap-1.5">
                  {team.members.map(m => (
                    <div key={m._id} className="text-xs bg-muted text-foreground px-2 py-1 rounded-md border border-border">
                      {m.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTeamId && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Section 1: GitHub Activity & Contribution Panel (Sidebar on XL) */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="p-6 border-b border-border bg-muted/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
                        <Github size={16} />
                      </div>
                      GitHub Pipeline
                    </h3>
                    {activeTeam?.repoUrl && (
                      <a
                        href={activeTeam.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium mt-2"
                      >
                        <ExternalLink size={12} /> {activeTeam.repoUrl}
                      </a>
                    )}
                  </div>
                  <button
                    onClick={handleForceSync}
                    disabled={forceSyncing}
                    className="p-2 rounded-xl bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm disabled:opacity-50"
                    title="Force Sync"
                  >
                    <RefreshCw size={16} className={forceSyncing ? 'animate-spin text-primary' : ''} />
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 bg-background">
                <div className="space-y-4">
                  {metrics?.students?.map((st) => (
                    <div key={st.studentId} className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors group">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                           <div className="font-bold text-foreground text-sm">{st.name}</div>
                           <div className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md inline-block mt-1">
                             @{st.githubUsername || 'unlinked'}
                           </div>
                        </div>
                         <span
                          className={`font-bold px-2 py-1 rounded text-[9px] uppercase tracking-wider ${
                            st.syncStatus === 'ok'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : st.syncStatus === 'rate_limited'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {st.syncStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/50 rounded-lg p-2 border border-border/50">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Commits</span>
                          <span className="text-sm font-black text-foreground">{st.commitCount}</span>
                        </div>
                        <div className="bg-emerald-500/5 rounded-lg p-2 border border-emerald-500/10">
                          <span className="text-[9px] text-emerald-600/70 block uppercase font-bold tracking-wider mb-0.5">+ Lines</span>
                          <span className="text-sm font-black text-emerald-600">+{st.linesAdded}</span>
                        </div>
                        <div className="bg-destructive/5 rounded-lg p-2 border border-destructive/10">
                          <span className="text-[9px] text-destructive/70 block uppercase font-bold tracking-wider mb-0.5">- Lines</span>
                          <span className="text-sm font-black text-destructive">-{st.linesDeleted}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Clock size={12} />
                        {st.lastSyncedAt
                          ? `Synced ${Math.round((Date.now() - new Date(st.lastSyncedAt)) / 60000)}m ago`
                          : 'Never synced'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Milestone Evaluation Grid */}
          <div className="xl:col-span-8">
            <div className="bg-card border border-border rounded-2xl shadow-sm h-full flex flex-col">
              <div className="p-6 md:p-8 border-b border-border">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Code2 size={20} />
                  </div>
                  Evaluation Matrix
                </h3>
                <p className="text-sm text-muted-foreground mt-2 pl-13">
                  Click any milestone cell to evaluate the student's score and provide feedback.
                </p>
              </div>

              <div className="p-6 overflow-x-auto flex-1 scrollbar-hide">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="pb-3 px-4 font-bold text-left">Student</th>
                      {(summaryData?.students?.[0]?.scores || []).map((scoreItem) => (
                        <th key={scoreItem.order || scoreItem.milestoneId?._id} className="pb-3 px-2 text-center w-20">
                          M{scoreItem.order}
                        </th>
                      ))}
                      <th className="pb-3 px-4 text-right w-32">Total Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summaryData?.students?.map((row) => (
                      <tr key={row.student._id} className="hover:bg-muted/30 transition-colors group">
                        <td className="py-4 px-4">
                          <div className="font-bold text-sm text-foreground">{row.student.name}</div>
                          <div className="text-[11px] font-medium text-muted-foreground mt-0.5">@{row.student.githubUsername}</div>
                        </td>

                        {(row.scores || []).map((scoreObj) => {
                          const isGraded = scoreObj && scoreObj.status === 'graded';
                          const isOrphaned = scoreObj && scoreObj.isOrphaned;

                          return (
                            <td key={scoreObj.order || scoreObj.milestoneId?._id} className="py-4 px-2 text-center">
                              <button
                                onClick={() => openGradeModal(row.student, scoreObj)}
                                className={`w-14 h-14 rounded-xl font-bold text-sm flex flex-col items-center justify-center mx-auto border-2 transition-all duration-200 ${
                                  isOrphaned
                                    ? 'bg-destructive/10 text-destructive border-destructive/20 opacity-60'
                                    : isGraded
                                    ? 'bg-primary border-primary text-primary-foreground shadow-soft hover:-translate-y-0.5'
                                    : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                                }`}
                                title={isOrphaned ? 'Orphaned milestone grade (template deleted)' : ''}
                              >
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="leading-none mt-1">{isGraded ? scoreObj.score : '-'}</span>
                                  {scoreObj.requiresExternalReview && (
                                    <span className={`text-[8px] px-1 rounded-sm uppercase tracking-wider font-extrabold ${scoreObj.externalStatus === 'graded' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                      {scoreObj.externalStatus === 'graded' ? scoreObj.externalScore : 'EXT'}
                                    </span>
                                  )}
                                </div>
                              </button>
                            </td>
                          );
                        })}

                        <td className="py-4 px-4 text-right">
                          <div className="font-black text-emerald-600 text-lg">
                            {row.progressSummary?.totalScore || 0} <span className="text-xs font-semibold text-emerald-600/70">pts</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                            {row.progressSummary?.percentComplete}% done
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Grade Modal */}
      <GradeModal />
    </div>
  );
};
