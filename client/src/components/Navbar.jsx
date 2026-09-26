import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Logo */}
        <div 
          className="flex items-center space-x-2 cursor-pointer text-gray-900" 
          onClick={() => navigate('/')}
        >
          <img src="/logo.svg" alt="ProEvaluator Logo" className="w-8 h-8 rounded-lg" />
          <h1 className="font-semibold text-lg tracking-tight">ProEvaluator</h1>
        </div>

        {/* Action */}
        {user && (
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium text-gray-600 hidden sm:block">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              title="Log out"
            >
              <LogOut size={18} className="mr-1.5" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
