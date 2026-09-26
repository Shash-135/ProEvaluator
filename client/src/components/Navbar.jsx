import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, Shield, GraduationCap, Eye, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLE_BADGES = {
  admin: { label: 'Admin', icon: Shield, className: 'bg-primary/10 text-primary border-primary/20' },
  teacher: { label: 'Faculty', icon: UserCheck, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  external: { label: 'External', icon: Eye, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  student: { label: 'Student', icon: GraduationCap, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
};

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleMeta = user?.role ? ROLE_BADGES[user.role] : null;
  const RoleIcon = roleMeta?.icon;

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={() => navigate('/')}
        >
          <img src="/logo.svg" alt="ProEvaluator" className="w-8 h-8 rounded-xl group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-foreground group-hover:text-primary transition-colors">
              ProEvaluator
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider -mt-1 hidden sm:block">
              Evaluation System
            </span>
          </div>
        </div>

        {/* User Actions */}
        {user && (
          <div className="flex items-center space-x-3 sm:space-x-5">
            <div className="flex items-center gap-3">
              {roleMeta && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleMeta.className}`}>
                  {RoleIcon && <RoleIcon size={12} />}
                  {roleMeta.label}
                </span>
              )}
              
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-sm font-bold text-foreground">
                  {user.name}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-3 py-2 rounded-xl transition-all"
              title="Log out"
            >
              <LogOut size={16} className="mr-1.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

