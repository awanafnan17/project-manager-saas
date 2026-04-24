import api from './client';
import type { ApiResponse, Project, ProjectMember, CreateProjectData } from '../types';

export const projectsApi = {
  getProjects: (query?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get<ApiResponse<{ projects: Project[]; total: number; page: number; totalPages: number }>>('/projects', { params: query }),

  getProject: (id: string) =>
    api.get<ApiResponse<Project>>(`/projects/${id}`),

  createProject: (data: CreateProjectData) =>
    api.post<ApiResponse<Project>>('/projects', data),

  updateProject: (id: string, data: Partial<CreateProjectData>) =>
    api.put<ApiResponse<Project>>(`/projects/${id}`, data),

  deleteProject: (id: string) =>
    api.delete<ApiResponse<null>>(`/projects/${id}`),

  addMember: (projectId: string, userId: string, role: string) =>
    api.post<ApiResponse<ProjectMember[]>>(`/projects/${projectId}/members`, { userId, role }),

  removeMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};
