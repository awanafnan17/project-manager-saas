import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import type { User, Tenant } from '../types';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { organizationName: string; firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (user: User, tenant: Tenant, token: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data: res } = await authApi.login(email, password);
      const { user, tenant, accessToken } = res.data;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_tenant', JSON.stringify(tenant));
      set({ user, tenant, accessToken, isAuthenticated: true, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const { data: res } = await authApi.register(data);
      const { user, tenant, accessToken } = res.data;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_tenant', JSON.stringify(tenant));
      set({ user, tenant, accessToken, isAuthenticated: true, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_tenant');
    set({ user: null, tenant: null, accessToken: null, isAuthenticated: false });
  },

  setAuth: (user, tenant, token) => {
    set({ user, tenant, accessToken: token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_tenant');
    set({ user: null, tenant: null, accessToken: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('auth_user');
    const tenantStr = localStorage.getItem('auth_tenant');
    if (token && userStr && tenantStr) {
      try {
        set({
          accessToken: token,
          user: JSON.parse(userStr),
          tenant: JSON.parse(tenantStr),
          isAuthenticated: true,
        });
      } catch {
        localStorage.clear();
      }
    }
  },
}));
