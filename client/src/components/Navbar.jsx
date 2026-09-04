import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, User, Shield, GraduationCap, Award, BookOpen, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', color: 'bg-primary/10 text-primary border-primary/20', icon: Shield };
      case 'teacher':
        return { label: 'Teacher', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: GraduationCap };
      case 'external':
        return { label: 'External Evaluator', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Award };
      default:
        return { label: 'Student', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: BookOpen };
    }
  };

  const roleInfo = user ? getRoleBadge(user.role) : null;
  const RoleIcon = roleInfo?.icon;

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-40 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-soft group-hover:scale-105 transition-transform duration-200">
            PE
          </div>
          <div>
            <h1 className="font-bold text-base text-foreground leading-tight tracking-tight">ProEvaluator</h1>
            <p className="text-[11px] text-muted-foreground font-medium">College Project Tracking</p>
          </div>
        </div>

        {/* Desktop Nav */}
        {user && (
          <div className="hidden sm:flex items-center space-x-4">
            {roleInfo && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border ${roleInfo.color} shadow-sm`}>
                <RoleIcon size={14} />
                {roleInfo.label}
              </span>
            )}
            
            <div className="flex items-center space-x-3 px-4 py-1.5 rounded-full bg-muted/50 border border-border">
              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground shadow-sm">
                <User size={15} />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-foreground leading-none">{user.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{user.email}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}

        {/* Mobile Toggle */}
        {user && (
          <button 
            className="sm:hidden p-2 -mr-2 text-muted-foreground hover:bg-muted rounded-md"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      {user && mobileMenuOpen && (
        <div className="sm:hidden border-t border-border bg-background px-4 py-4 space-y-4 animate-accordion-down">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border">
              <User size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          
          {roleInfo && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full border ${roleInfo.color}`}>
              <RoleIcon size={16} />
              {roleInfo.label}
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-colors font-medium text-sm"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      )}
    </header>
  );
};
