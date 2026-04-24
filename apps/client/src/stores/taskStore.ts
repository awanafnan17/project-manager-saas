import { create } from 'zustand';
import { tasksApi } from '../api/tasks.api';
import type { Task, TaskStatus, CreateTaskData } from '../types';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;

  fetchTasks: (projectId: string) => Promise<void>;
  createTask: (projectId: string, data: Omit<CreateTaskData, 'projectId'>) => Promise<Task>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  assignTask: (id: string, assigneeId: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getByStatus: (status: TaskStatus) => Task[];
  clearTasks: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const { data: res } = await tasksApi.getTasks(projectId, { limit: 200 });
      set({ tasks: (res.data as any).tasks, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to load tasks', loading: false });
    }
  },

  createTask: async (projectId, data) => {
    const { data: res } = await tasksApi.createTask(projectId, data);
    const task = res.data as any;
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTaskStatus: async (id, status) => {
    // Optimistic update
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
    try {
      await tasksApi.updateTaskStatus(id, status);
    } catch {
      // Revert on failure — refetch
      const task = get().tasks.find((t) => t.id === id);
      if (task) {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? task : t)),
        }));
      }
    }
  },

  assignTask: async (id, assigneeId) => {
    const { data: res } = await tasksApi.assignTask(id, assigneeId);
    const updated = res.data as any;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    }));
  },

  deleteTask: async (id) => {
    await tasksApi.deleteTask(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  getByStatus: (status) => get().tasks.filter((t) => t.status === status),

  clearTasks: () => set({ tasks: [], error: null }),
}));
