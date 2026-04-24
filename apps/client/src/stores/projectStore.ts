import { create } from 'zustand';
import { projectsApi } from '../api/projects.api';
import type { Project, CreateProjectData } from '../types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;

  fetchProjects: (query?: { search?: string; status?: string; page?: number }) => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, data: Partial<CreateProjectData>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  total: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  error: null,

  fetchProjects: async (query) => {
    set({ loading: true, error: null });
    try {
      const { data: res } = await projectsApi.getProjects(query);
      const d = res.data as any;
      set({ projects: d.projects, total: d.total, page: d.page, totalPages: d.totalPages, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to load projects', loading: false });
    }
  },

  fetchProject: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data: res } = await projectsApi.getProject(id);
      set({ currentProject: res.data as any, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to load project', loading: false });
    }
  },

  createProject: async (data) => {
    const { data: res } = await projectsApi.createProject(data);
    const project = res.data as any;
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  updateProject: async (id, data) => {
    const { data: res } = await projectsApi.updateProject(id, data);
    const updated = res.data as any;
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      currentProject: s.currentProject?.id === id ? { ...s.currentProject, ...updated } : s.currentProject,
    }));
  },

  deleteProject: async (id) => {
    await projectsApi.deleteProject(id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  clearCurrent: () => set({ currentProject: null }),
}));
