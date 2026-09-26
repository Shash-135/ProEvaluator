import React from 'react';
import { GitCommit, PieChart, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

const COLORS = [
  { bar: 'bg-primary', text: 'text-primary', border: 'border-primary/30', bgLight: 'bg-primary/10' },
  { bar: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500/30', bgLight: 'bg-emerald-500/10' },
  { bar: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500/30', bgLight: 'bg-amber-500/10' },
  { bar: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500/30', bgLight: 'bg-purple-500/10' },
  { bar: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-500/30', bgLight: 'bg-rose-500/10' },
  { bar: 'bg-sky-500', text: 'text-sky-600', border: 'border-sky-500/30', bgLight: 'bg-sky-500/10' },
];

export const ContributionBreakdown = ({ studentsMetrics = [] }) => {
  if (!studentsMetrics || studentsMetrics.length === 0) return null;

  const totalCommits = studentsMetrics.reduce((sum, s) => sum + (s.commitCount || 0), 0);
  const totalLinesAdded = studentsMetrics.reduce((sum, s) => sum + (s.linesAdded || 0), 0);

  // If there are zero commits overall
  if (totalCommits === 0) {
    return (
      <div className="p-4 rounded-xl bg-muted/20 border border-border text-center">
        <p className="text-xs text-muted-foreground font-medium">No commits detected yet in the repository.</p>
      </div>
    );
  }

  // Calculate percentages
  const memberStats = studentsMetrics.map((s, index) => {
    const commitPct = totalCommits > 0 ? Math.round(((s.commitCount || 0) / totalCommits) * 100) : 0;
    const linesPct = totalLinesAdded > 0 ? Math.round(((s.linesAdded || 0) / totalLinesAdded) * 100) : 0;
    // Composite contribution: 60% commits + 40% code volume
    const compositePct = totalLinesAdded > 0 
      ? Math.round((commitPct * 0.5) + (linesPct * 0.5)) 
      : commitPct;

    const color = COLORS[index % COLORS.length];

    return {
      ...s,
      commitPct,
      linesPct,
      compositePct,
      color
    };
  });

  // Calculate equity metric
  const maxShare = Math.max(...memberStats.map(m => m.compositePct));
  const isHeavilySkewed = memberStats.length > 1 && maxShare >= 70;
  const isModerateSkew = memberStats.length > 1 && maxShare >= 55 && maxShare < 70;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <PieChart size={14} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Workload Distribution</h4>
            <p className="text-[10px] text-muted-foreground">{totalCommits} commits across {studentsMetrics.length} teammates</p>
          </div>
        </div>

        {memberStats.length > 1 && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isHeavilySkewed 
              ? 'bg-destructive/10 text-destructive border-destructive/20'
              : isModerateSkew
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
          }`}>
            {isHeavilySkewed ? (
              <><AlertTriangle size={11} /> High Disparity</>
            ) : isModerateSkew ? (
              <><AlertTriangle size={11} /> Moderate Split</>
            ) : (
              <><CheckCircle2 size={11} /> Balanced Effort</>
            )}
          </span>
        )}
      </div>

      {/* Stacked Percentage Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex shadow-inner">
          {memberStats.map((m) => (
            <div
              key={m.studentId}
              style={{ width: `${m.compositePct}%` }}
              className={`h-full ${m.color.bar} transition-all duration-500 relative group cursor-pointer`}
              title={`${m.name}: ${m.compositePct}% share (${m.commitCount} commits, +${m.linesAdded} lines)`}
            />
          ))}
        </div>

        {/* Legend / Breakdown Details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          {memberStats.map((m) => (
            <div key={m.studentId} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
              <span className={`w-2.5 h-2.5 rounded-full ${m.color.bar} shrink-0`} />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-foreground truncate block leading-tight">{m.name}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">{m.compositePct}% workload</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
