import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { Lock, Mail, Github, LogIn, User, ArrowRight } from 'lucide-react';

export const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [githubUsername, setGithubUsername] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { data: cohortsData } = useQuery({
    queryKey: ['public-cohorts'],
    queryFn: async () => (await api.get('/auth/cohorts')).data,
    enabled: isRegister
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister
        ? { name, email, password, role, githubUsername, cohortId }
        : { email, password };

      const res = await api.post(endpoint, payload);
      setAuth(res.data.user, res.data.accessToken);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <div className="h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Left side - Hero / Branding (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 lg:p-24 text-white">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 L100,100 L100,0 Z" fill="url(#grad1)" />
            <path d="M0,100 L100,0 L0,0 Z" fill="url(#grad2)" />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#4c1d95" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-2xl shadow-float">
            PE
          </div>
          <span className="font-bold text-2xl tracking-tight">ProEvaluator</span>
        </div>

        <div className="relative z-10 mt-12 md:mt-0">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight">
            Streamline your <br/><span className="text-blue-400">Project Evaluations.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-md">
            The all-in-one governance and assessment platform for computer science capstone projects.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-slate-400">
          &copy; {new Date().getFullYear()} College Project Tracking System.
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center py-4 px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-24 xl:px-32 bg-background relative z-10 overflow-hidden min-h-0 h-full">
        <div className="mx-auto w-full max-w-sm lg:max-w-md flex flex-col h-full justify-center">
          
          {/* Mobile Logo */}
          <div className="md:hidden flex flex-col items-center mb-2">
             <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg mb-2 shadow-soft">
              PE
            </div>
            <h2 className="text-xl font-bold text-foreground">ProEvaluator</h2>
          </div>

          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-xs lg:text-sm text-muted-foreground">
              {isRegister ? 'Enter your details to register as a student.' : 'Please enter your details to sign in.'}
            </p>
          </div>

          <div className="mt-4">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"></div>
                {error}
              </div>
            )}

            <div className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                {isRegister && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-medium text-foreground mb-1">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-sm shadow-sm"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-sm shadow-sm"
                      placeholder="name@college.edu"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex justify-between items-center text-xs font-medium text-foreground mb-1">
                    <span>Password</span>
                    {!isRegister && (
                      <Link to="/forgot-password" className="text-primary hover:underline font-semibold">Forgot password?</Link>
                    )}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                      <Lock size={16} />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-sm shadow-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {isRegister && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="flex justify-between items-center text-xs font-medium text-foreground mb-1">
                      <span>GitHub Username</span>
                    </label>
                    <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                        <Github size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-sm shadow-sm"
                        placeholder="octocat"
                      />
                    </div>
                  </div>
                )}

                {isRegister && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-medium text-foreground mb-1">Your Cohort</label>
                    <select
                      required
                      value={cohortId}
                      onChange={(e) => setCohortId(e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-sm shadow-sm"
                    >
                      <option value="">Select a Cohort</option>
                      {cohortsData?.cohorts?.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-xl shadow-soft text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                         {isRegister ? 'Create Account' : 'Sign In'}
                         <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-background text-muted-foreground font-medium">Or continue with</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  className="w-full inline-flex justify-center items-center py-2 px-4 border border-border rounded-xl shadow-sm bg-background text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  className="w-full inline-flex justify-center items-center py-2 px-4 border border-border rounded-xl shadow-sm bg-background text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors gap-2"
                >
                  <Github size={16} />
                  GitHub
                </button>
              </div>
            </div>

            <div className="mt-4 text-center">
               <button
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {isRegister ? (
                  <>Already have an account? <span className="font-semibold text-foreground">Sign in</span></>
                ) : (
                  <>Don't have an account? <span className="font-semibold text-foreground">Sign up</span></>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
