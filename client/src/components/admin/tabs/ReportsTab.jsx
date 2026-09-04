import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';
import { BarChart3 } from 'lucide-react';

export const ReportsTab = ({ batchesData, selectedBatchId, setSelectedBatchId }) => {
  const { data: batchReportData } = useQuery({
    queryKey: ['admin-report-batch', selectedBatchId],
    queryFn: async () => (await api.get(`/admin/reports/batch/${selectedBatchId}`)).data,
    enabled: !!selectedBatchId
  });

  const { data: workloadData } = useQuery({
    queryKey: ['admin-workload'],
    queryFn: async () => (await api.get('/admin/reports/faculty-workload')).data
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">Analytics & Workload</h2>
        </div>
        {/* Batch Filter for Reports */}
        {batchesData?.batches && batchesData.batches.length > 0 && (
           <select
              value={selectedBatchId || ''}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-foreground shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
           >
             <option value="" disabled>Select Batch to Filter...</option>
             {batchesData.batches.map(b => (
                <option key={b.id || b._id} value={b.id || b._id}>{b.name} ({b.academicYear})</option>
             ))}
           </select>
        )}
      </div>

      {batchReportData?.report && selectedBatchId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Teams</span>
            <div className="text-3xl font-black text-foreground mt-2">{batchReportData.report.totalTeams}</div>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Students</span>
            <div className="text-3xl font-black text-foreground mt-2">{batchReportData.report.totalStudents}</div>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Unassigned Teams</span>
            <div className="text-3xl font-black text-amber-600 mt-2">{batchReportData.report.unassignedTeams}</div>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Avg Completion</span>
            <div className="text-3xl font-black text-emerald-500 mt-2">{batchReportData.report.overallCompletionPercent}%</div>
          </div>
        </div>
      )}

      {!selectedBatchId && (
        <div className="p-8 text-center bg-muted/30 border border-dashed border-border rounded-2xl">
          <p className="text-sm font-bold text-muted-foreground">Please select a batch from the dropdown above to view batch analytics.</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-base text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
          <BarChart3 size={18} className="text-primary"/> Faculty Workload & Evaluation Summary
        </h3>
        <div className="space-y-4">
          {workloadData?.workload?.map((w) => (
            <div key={w.teacherId} className="p-4 rounded-xl bg-background border border-border flex items-center justify-between hover:border-primary/40 transition-colors">
              <div>
                <div className="font-bold text-foreground text-sm">{w.name} <span className="font-medium text-muted-foreground text-xs ml-1">({w.email})</span></div>
                <div className="text-[11px] font-bold text-muted-foreground mt-1.5 uppercase tracking-wider">Assigned Teams: <span className="text-foreground">{w.assignedTeamCount}</span></div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-primary">{w.averageCompletionPercent}%</span>
                <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider mt-0.5">Avg Milestone Completion</span>
              </div>
            </div>
          ))}

          {(!workloadData?.workload || workloadData.workload.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-4">No workload data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};
