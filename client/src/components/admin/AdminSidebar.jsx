import React from 'react';
import { Shield, BookOpen, UserCheck, BarChart3, History } from 'lucide-react';

const TABS = [
  { id: 'batches', label: 'Batches', icon: BookOpen },
  { id: 'users', label: 'Faculty & Users', icon: UserCheck },
  { id: 'reports', label: 'Analytics & Workload', icon: BarChart3 },
  { id: 'logs', label: 'Audit Log Trail', icon: History }
];

export const AdminSidebar = ({ activeTab, setActiveTab, setSelectedBatchId }) => {
  return (
    <>
      {/* Modern Sidebar (Desktop) */}
      <div className="w-64 shrink-0 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider mb-3">
            <Shield size={12} /> Governance
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight leading-tight">Admin<br/>Console</h2>
        </div>
        <div className="p-4 flex-1 space-y-1.5 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'batches') setSelectedBatchId(null);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm translate-x-1'
                    : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-primary-foreground' : 'text-muted-foreground'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Header (Hidden on Desktop) */}
      <div className="md:hidden flex flex-col w-full">
         <div className="p-4 border-b border-border bg-card">
           <h2 className="text-lg font-black text-foreground flex items-center gap-2">
             <Shield size={16} className="text-primary"/> Admin Console
           </h2>
           <div className="flex overflow-x-auto gap-2 mt-4 pb-2 scrollbar-hide">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === 'batches') setSelectedBatchId(null);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon size={12} /> {tab.label}
                  </button>
                )
              })}
           </div>
         </div>
      </div>
    </>
  );
};
