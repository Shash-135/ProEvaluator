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
  ChevronRight,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { downloadCsv } from '../utils/exportCsv';
import { ContributionBreakdown } from '../components/ContributionBreakdown';

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

  const handleExportCsv = () => {
    if (!summaryData?.students || summaryData.students.length === 0) return;
    const sampleScores = summaryData.students[0]?.scores || [];
    const milestoneHeaders = sampleScores.map(s => `M${s.order} (${s.milestoneId?.title || ''})`);
    const headers = ['Student Name', 'Email', 'GitHub Username', 'Team Name', ...milestoneHeaders, 'Total Score', 'Percent Completed'];

    const rows = summaryData.students.map(row => {
      const scoreCols = (row.scores || []).map(s => s.status === 'graded' ? s.score : 'N/A');
      return [
        row.student.name,
        row.student.email,
        row.student.githubUsername || '',
        activeTeam?.name || '',
        ...scoreCols,
        row.progressSummary?.totalScore || 0,
        `${row.progressSummary?.percentComplete || 0}%`
      ];
    });

    const filename = `${activeTeam?.name || 'team'}_grades_${new Date().toISOString().split('T')[0]}`;
    downloadCsv(filename, headers, rows);
  };

  const activeTeam = teams.find((t) => t._id === activeTeamId);
  const metrics = metricsData?.metrics;

  const groupedTeams = teams.reduce((acc, team) => {
    const cohortName = team.batch?.cohort?.name || 'Academic Cohort';
    const batchName = team.batch?.name || 'Semester';
    const groupName = `${cohortName} - ${batchName}`;
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(team);
    return acc;
  }, {});

  return (
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Breadcrumbs & Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-2">
            <button 
              onClick={() => { setSelectedGroup(''); setSelectedTeamId(''); }}
              className={`hover:text-primary transition-colors ${!selectedGroup && !activeTeamId ? 'text-primary' : ''}`}
            >
              Faculty Portal
            </button>
            {selectedGroup && (
              <>
                <ChevronRight size={12} />
                <button 
                  onClick={() => setSelectedTeamId('')}
                  className={`hover:text-primary transition-colors ${!activeTeamId ? 'text-primary' : ''}`}
                >
                  {selectedGroup}
                </button>
              </>
            )}
            {activeTeam && (
              <>
                <ChevronRight size={12} />
                <span className="text-foreground">{activeTeam.name}</span>
              </>
            )}
          </nav>

          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {activeTeamId ? activeTeam?.name : selectedGroup ? selectedGroup : 'Assigned Evaluations'}
          </h1>
        </div>

        {activeTeam && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-card border border-border text-foreground text-xs font-bold hover:bg-muted transition-all flex items-center gap-1.5 shadow-sm"
              title="Download Team Grade Sheet CSV"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Export CSV</span>
            </button>

            {activeTeam.repoUrl && (
              <a
                href={activeTeam.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-card border border-border text-foreground text-xs font-bold hover:border-primary/40 hover:text-primary transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Github size={14} /> Repository <ExternalLink size={12} />
              </a>
            )}
            <button
              onClick={handleForceSync}
              disabled={forceSyncing}
              className="px-3.5 py-2 rounded-xl bg-card border border-border text-foreground text-xs font-bold hover:bg-muted transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={forceSyncing ? 'animate-spin text-primary' : ''} />
              <span>{forceSyncing ? 'Syncing...' : 'Sync Git'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State: No Teams */}
      {teams.length === 0 && !loadingTeams && (
        <div className="py-16 text-center bg-card border border-border rounded-2xl shadow-sm max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <UserCheck size={24} />
          </div>
          <h2 className="text-base font-bold text-foreground">No Teams Assigned Yet</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Your department coordinator has not assigned any project teams to your account for this semester.
          </p>
        </div>
      )}

      {/* Tier 1: Semesters Grid */}
      {!activeTeamId && !selectedGroup && teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.entries(groupedTeams).map(([groupName, groupTeams]) => (
            <div
              key={groupName}
              onClick={() => setSelectedGroup(groupName)}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-105 transition-transform">
                  <BookOpen size={20} />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {groupTeams.length} {groupTeams.length === 1 ? 'Team' : 'Teams'}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {groupName}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Click to inspect teams & milestones</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tier 2: Teams in Selected Semester */}
      {!activeTeamId && selectedGroup && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {groupedTeams[selectedGroup]?.map((team) => (
            <div
              key={team._id}
              onClick={() => setSelectedTeamId(team._id)}
              className="bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all rounded-2xl p-6 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
                    {team.name}
                  </h3>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    team.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }`}>
                    {team.status}
                  </span>
                </div>

                <div className="space-y-1.5 mb-4">
                  {team.members.map((m) => (
                    <div key={m._id} className="text-xs text-muted-foreground flex items-center justify-between py-0.5">
                      <span className="font-semibold text-foreground">{m.name}</span>
                      <span className="text-[11px]">@{m.githubUsername || 'unlinked'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-primary">
                <span>Evaluate Team</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tier 3: Active Team Evaluation Matrix & GitHub Activity */}
      {activeTeamId && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* GitHub Activity Sidebar (4 cols on xl) */}
          <div className="xl:col-span-4 space-y-5">
            {metrics?.students?.length > 0 && (
              <ContributionBreakdown studentsMetrics={metrics.students} />
            )}

            <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Github size={16} />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-foreground">GitHub Activity</h2>
                    <p className="text-[10px] text-muted-foreground">Individual commit audit</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {metrics?.students?.map((st) => (
                  <div key={st.studentId} className="p-3.5 rounded-xl bg-background border border-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-foreground block">{st.name}</span>
                        <span className="text-[10px] text-muted-foreground">@{st.githubUsername || 'unlinked'}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        st.syncStatus === 'ok'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {st.syncStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-muted/40 rounded-lg p-1.5 border border-border/50">
                        <span className="text-[9px] text-muted-foreground block font-bold">Commits</span>
                        <span className="font-black text-foreground">{st.commitCount}</span>
                      </div>
                      <div className="bg-emerald-500/5 rounded-lg p-1.5 border border-emerald-500/20">
                        <span className="text-[9px] text-emerald-600/80 block font-bold">+ Lines</span>
                        <span className="font-black text-emerald-600">+{st.linesAdded}</span>
                      </div>
                      <div className="bg-destructive/5 rounded-lg p-1.5 border border-destructive/20">
                        <span className="text-[9px] text-destructive/80 block font-bold">- Lines</span>
                        <span className="font-black text-destructive">-{st.linesDeleted}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium pt-1">
                      <Clock size={11} />
                      {st.lastSyncedAt
                        ? `Synced ${Math.round((Date.now() - new Date(st.lastSyncedAt)) / 60000)}m ago`
                        : 'Never synced'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Milestone Evaluation Matrix (8 cols on xl) */}
          <div className="xl:col-span-8">
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 md:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Award size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">Milestone Evaluation Matrix</h2>
                    <p className="text-xs text-muted-foreground">Click any milestone cell to grade or provide feedback</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="pb-3 px-3 text-left">Student</th>
                      {(summaryData?.students?.[0]?.scores || []).map((scoreItem) => (
                        <th key={scoreItem.order || scoreItem.milestoneId?._id} className="pb-3 px-2 text-center w-16">
                          M{scoreItem.order}
                        </th>
                      ))}
                      <th className="pb-3 px-3 text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summaryData?.students?.map((row) => (
                      <tr key={row.student._id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-sm text-foreground block">{row.student.name}</span>
                          <span className="text-[11px] text-muted-foreground">@{row.student.githubUsername || 'unlinked'}</span>
                        </td>

                        {(row.scores || []).map((scoreObj) => {
                          const isGraded = scoreObj && scoreObj.status === 'graded';
                          const isOrphaned = scoreObj && scoreObj.isOrphaned;

                          return (
                            <td key={scoreObj.order || scoreObj.milestoneId?._id} className="py-3.5 px-2 text-center">
                              <button
                                onClick={() => openGradeModal(row.student, scoreObj)}
                                className={`w-12 h-12 rounded-xl font-bold text-xs flex flex-col items-center justify-center mx-auto border transition-all ${
                                  isOrphaned
                                    ? 'bg-destructive/10 text-destructive border-destructive/20 opacity-60'
                                    : isGraded
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:scale-105'
                                    : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                                }`}
                                title={isOrphaned ? 'Orphaned milestone template' : ''}
                              >
                                <span className="leading-none">{isGraded ? scoreObj.score : '+'}</span>
                                {scoreObj.requiresExternalReview && (
                                  <span className={`text-[7px] font-black px-1 rounded uppercase tracking-wider mt-1 ${
                                    scoreObj.externalStatus === 'graded' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {scoreObj.externalStatus === 'graded' ? scoreObj.externalScore : 'EXT'}
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-3 text-right">
                          <div className="font-black text-foreground text-base">
                            {row.progressSummary?.totalScore || 0} <span className="text-xs text-muted-foreground font-semibold">pts</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-bold">
                            {row.progressSummary?.percentComplete}% completed
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

      {/* Grade Modal */}
      <GradeModal />
    </div>
  );
};
