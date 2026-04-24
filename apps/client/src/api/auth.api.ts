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

  logout: () => api.post('/auth/logout'),

  refresh: () => api.post('/auth/refresh'),
};
