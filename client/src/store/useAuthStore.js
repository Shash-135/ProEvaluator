import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: true,

  setAuth: (user, token) => {
    if (token) localStorage.setItem('token', token);
    set({ user, token, loading: false });
  },

  fetchMe: async () => {
    // If we're on the OAuth callback page, grab the new token from the URL immediately 
    // to prevent using an old/expired token that would trigger a 401 redirect.
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        localStorage.setItem('token', urlToken);
      }
    }

    const token = localStorage.getItem('token');
    
    // Small delay to prevent mount race conditions during OAuth callbacks
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Delay removed for production

    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      let fetchedUser = res.data.user;
      if (fetchedUser && typeof fetchedUser === 'object') {
        fetchedUser = { ...fetchedUser };
        if (fetchedUser._id) {
          fetchedUser.id = fetchedUser._id;
        }
      }
      set({ user: fetchedUser, loading: false });
    } catch (err) {
      console.error("fetchMe error:", err);
      localStorage.removeItem('token');
      set({ user: null, token: null, loading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // ignore
    }
    localStorage.removeItem('token');
    set({ user: null, token: null, loading: false });
  }
}));
