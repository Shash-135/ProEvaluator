import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';
import { History } from 'lucide-react';

export const LogsTab = () => {
  const { data: auditLogsData } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => (await api.get('/admin/logs')).data
  });

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
      <h3 className="font-bold text-base text-foreground mb-4 pb-4 border-b border-border flex items-center gap-2">
        <History size={18} className="text-primary" /> Audit Log Trail
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border font-bold text-muted-foreground uppercase tracking-wider text-[10px] bg-muted/50">
              <th className="py-3 px-4 rounded-tl-xl">Timestamp</th>
              <th className="py-3 px-3">Actor</th>
              <th className="py-3 px-3">Action</th>
              <th className="py-3 px-4 rounded-tr-xl">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {auditLogsData?.logs?.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="py-3 px-3 font-bold text-foreground whitespace-nowrap">{log.actorName}</td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="px-2 py-1 bg-muted text-foreground font-mono text-[9px] font-bold rounded-md border border-border tracking-wider">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-foreground font-medium">{log.details}</td>
              </tr>
            ))}
            
            {(!auditLogsData?.logs || auditLogsData.logs.length === 0) && (
              <tr>
                <td colSpan="4" className="py-8 text-center text-muted-foreground font-medium">No audit logs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
