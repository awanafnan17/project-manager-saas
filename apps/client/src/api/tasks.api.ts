import api from './client';
import type { ApiResponse, Task, CreateTaskData } from '../types';

export const tasksApi = {
  getTasks: (projectId: string, query?: { status?: string; assigneeId?: string; priority?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<{ tasks: Task[]; total: number; page: number; totalPages: number }>>(`/projects/${projectId}/tasks`, { params: query }),

  getTask: (id: string) =>
    api.get<ApiResponse<Task>>(`/tasks/${id}`),

  createTask: (projectId: string, data: Omit<CreateTaskData, 'projectId'>) =>
    api.post<ApiResponse<Task>>(`/projects/${projectId}/tasks`, { ...data, projectId }),

  updateTask: (id: string, data: Partial<CreateTaskData>) =>
    api.put<ApiResponse<Task>>(`/tasks/${id}`, data),

  updateTaskStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Task>>(`/tasks/${id}/status`, { status }),

  assignTask: (id: string, assigneeId: string) =>
    api.patch<ApiResponse<Task>>(`/tasks/${id}/assign`, { assigneeId }),

  deleteTask: (id: string) =>
    api.delete(`/tasks/${id}`),
};
