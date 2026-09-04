import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useUiStore } from '../store/useUiStore';
import { GradeModal } from '../components/GradeModal';
import { Award, Eye, Github, ChevronDown, LayoutDashboard, ArrowLeft, BookOpen } from 'lucide-react';

export const ExternalDashboard = () => {
  const { openGradeModal } = useUiStore();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ['external-teams'],
    queryFn: async () => (await api.get('/external/teams')).data
  });

  const teams = teamsData?.teams || [];
  const activeTeamId = selectedTeamId;

  const { data: summaryData } = useQuery({
    queryKey: ['team-summary', activeTeamId],
    queryFn: async () => (await api.get(`/external/teams/${activeTeamId}`)).data,
    enabled: !!activeTeamId
  });

  const { data: metricsData } = useQuery({
    queryKey: ['team-metrics', activeTeamId],
    queryFn: async () => (await api.get(`/external/teams/${activeTeamId}/metrics`)).data,
    enabled: !!activeTeamId
  });

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
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-6 gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 font-semibold text-xs mb-3 border border-amber-500/20">
            <Eye size={14} /> External Evaluator Portal (Read-Only)
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
            {activeTeamId ? `Evaluating: ${teams.find(t => t._id === activeTeamId)?.name}` : selectedGroup ? `Teams in ${selectedGroup}` : 'Team Evaluation Mirror'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {activeTeamId ? 'Review GitHub contributions and provide independent external grades.' : selectedGroup ? 'Select a team to evaluate.' : 'Select a semester block to view assigned teams.'}
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
            <Eye size={32} />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No Linked Teams Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You are not currently paired with any internal teachers or teams.
          </p>
        </div>
      )}

      {!activeTeamId && !selectedGroup && teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {Object.entries(groupedTeams).map(([groupName, groupTeams]) => (
            <div
              key={groupName}
              onClick={() => setSelectedGroup(groupName)}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
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
              className="group bg-card border border-border hover:border-amber-500/50 hover:shadow-md transition-all rounded-2xl p-6 cursor-pointer flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-foreground text-lg group-hover:text-amber-600 transition-colors">{team.name}</h4>
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
          {/* GitHub Metrics View */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-6 border-b border-border bg-amber-500/5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
                    <Github size={16} />
                  </div>
                  Live GitHub Contributions
                </h3>
              </div>
              <div className="p-6 flex-1 bg-background space-y-4">
                {metricsData?.metrics?.students?.map((st) => (
                  <div key={st.studentId} className="p-4 rounded-xl border border-border hover:border-amber-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                         <div className="font-bold text-foreground text-sm">{st.name}</div>
                         <div className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md inline-block mt-1">
                           @{st.githubUsername || 'unlinked'}
                         </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded-lg p-2 border border-border/50">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Commits</span>
                        <span className="text-sm font-black text-foreground">{st.commitCount}</span>
                      </div>
                      <div className="bg-emerald-500/5 rounded-lg p-2 border border-emerald-500/10">
                        <span className="text-[9px] text-emerald-600/70 block uppercase font-bold tracking-wider mb-0.5">Added</span>
                        <span className="text-sm font-black text-emerald-600">+{st.linesAdded}</span>
                      </div>
                      <div className="bg-destructive/5 rounded-lg p-2 border border-destructive/10">
                        <span className="text-[9px] text-destructive/70 block uppercase font-bold tracking-wider mb-0.5">Deleted</span>
                        <span className="text-sm font-black text-destructive">-{st.linesDeleted}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Scores Grid */}
          <div className="xl:col-span-8">
            <div className="bg-card border border-border rounded-2xl shadow-sm h-full flex flex-col">
              <div className="p-6 md:p-8 border-b border-border">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Award size={20} />
                  </div>
                  External Evaluation Matrix
                </h3>
              </div>
              <div className="p-6 overflow-x-auto flex-1 scrollbar-hide">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="pb-3 px-4 text-left">Student</th>
                      {(summaryData?.students?.[0]?.scores || []).map((scoreItem) => (
                        <th key={scoreItem.order || scoreItem.milestoneId?._id} className="pb-3 px-2 text-center w-16">
                          M{scoreItem.order}
                        </th>
                      ))}
                      <th className="pb-3 px-4 text-right w-32">Total Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summaryData?.students?.map((row) => (
                      <tr key={row.student._id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4">
                           <div className="font-bold text-sm text-foreground">{row.student.name}</div>
                        </td>
                        {(row.scores || []).map((scoreObj) => {
                          const isExternalGraded = scoreObj && scoreObj.externalStatus === 'graded';
                          const isTeacherGraded = scoreObj && scoreObj.teacherStatus === 'graded';
                          const isOrphaned = scoreObj && scoreObj.isOrphaned;
                          
                          return (
                            <td key={scoreObj.order || scoreObj.milestoneId?._id} className="py-4 px-2 text-center">
                              {scoreObj.requiresExternalReview ? (
                                <button
                                  onClick={() => openGradeModal(row.student, scoreObj)}
                                  className={`w-12 h-12 rounded-xl font-bold text-sm flex flex-col items-center justify-center mx-auto border-2 transition-all duration-200 ${
                                    isOrphaned
                                      ? 'bg-destructive/10 text-destructive border-destructive/20 opacity-60'
                                      : isExternalGraded
                                      ? 'bg-amber-500 border-amber-600 text-white shadow-soft hover:-translate-y-0.5'
                                      : 'bg-background text-muted-foreground border-border hover:border-amber-500/40 hover:text-foreground'
                                  }`}
                                >
                                  {isExternalGraded ? scoreObj.externalScore : '-'}
                                </button>
                              ) : (
                                <div
                                  className={`w-12 h-12 mx-auto rounded-xl font-bold text-sm flex flex-col items-center justify-center border-2 ${
                                    isOrphaned
                                      ? 'bg-destructive/10 text-destructive border-destructive/20 opacity-60'
                                      : isTeacherGraded
                                      ? 'bg-muted text-foreground border-border'
                                      : 'bg-background text-muted-foreground border-transparent opacity-50'
                                  }`}
                                  title="Internal teacher score (read-only)"
                                >
                                  {isTeacherGraded ? scoreObj.teacherScore : '-'}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-4 px-4 text-right">
                          <div className="font-black text-amber-600 text-lg">
                            {row.progressSummary?.totalScore || 0} <span className="text-xs font-semibold text-amber-600/70">pts</span>
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
