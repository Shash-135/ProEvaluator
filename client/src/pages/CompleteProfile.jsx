import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import api from '../api/client';
import { Github, BookOpen, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const CompleteProfile = () => {
  const [cohortId, setCohortId] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();

  // Redirect if user is not a student or already has a cohortId
  useEffect(() => {
    if (user && (user.role !== 'student' || user.cohortId)) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Fetch active public cohorts
  const { data: cohortsData, isLoading: isLoadingCohorts } = useQuery({
    queryKey: ['public-cohorts'],
    queryFn: async () => (await api.get('/auth/cohorts')).data
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!cohortId) {
        setError('Please select a cohort.');
        setLoading(false);
        return;
      }

      const res = await api.post('/auth/complete-profile', {
        cohortId,
        githubUsername: githubUsername.trim() || undefined
      });

      // Update auth store with the new user data
      setAuth(res.data.user, localStorage.getItem('token'));
      
      toast.success('Profile completed! Redirecting to your dashboard...');
      
      // Redirect to home which will route to StudentDashboard
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      toast.error(err.response?.data?.error || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-md">
              <BookOpen size={24} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-slate-600">
            We just need a bit more information to get you started.
          </p>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex gap-3">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            Once you set your cohort, it cannot be changed without administrator assistance. Make sure to select the correct cohort.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
              {error}
            </div>
          )}

          {/* Cohort Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Select Your Cohort <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <BookOpen size={16} />
              </div>
              <select
                required
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                disabled={isLoadingCohorts}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <option value="">{isLoadingCohorts ? 'Loading cohorts...' : 'Select a Cohort'}</option>
                {cohortsData?.cohorts?.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Your cohort determines which teams and milestones you can access.
            </p>
          </div>

          {/* GitHub Username (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              GitHub Username <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Github size={16} />
              </div>
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                disabled={loading}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                placeholder="octocat"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Used to link your GitHub contributions to your profile.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || isLoadingCohorts}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                  Completing Profile...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Complete Profile
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Need help? Contact your administrator if you have any issues.
        </p>
      </div>
    </div>
  );
};
