// ─── User & Auth ──────────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'admin' | 'manager' | 'member';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tenant: Tenant;
    accessToken: string;
  };
  message: string;
}

// ─── Projects ─────────────────────────────────────────────────────

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string | null;
  endDate: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl'>;
  _count?: { members: number; tasks: number };
  members?: ProjectMember[];
  taskStats?: { status: string; count: number }[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'manager' | 'member';
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl' | 'role'>;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
}

// ─── Tasks ────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  estimatedHrs: number | null;
  position: number;
  assigneeId: string | null;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  assignee?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl'> | null;
  reporter?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl'>;
  project?: Pick<Project, 'id' | 'name' | 'status'>;
  taskLabels?: { label: { id: string; name: string; color: string } }[];
  comments?: any[];
  _count?: { comments: number; subtasks: number };
}

export interface CreateTaskData {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string;
  assigneeId?: string;
  estimatedHrs?: number;
}

// ─── API Responses ────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    [key: string]: T[] | number;
    total: number;
    page: number;
    totalPages: number;
  };
}
