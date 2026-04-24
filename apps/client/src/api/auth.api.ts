import api from './client';
import type { LoginResponse } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  register: (data: {
    organizationName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => api.post<LoginResponse>('/auth/register', data),

  logout: () => {
    const refreshToken = localStorage.getItem('refresh_token');
    return api.post('/auth/logout', { refreshToken });
  },

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};
