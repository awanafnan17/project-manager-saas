import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────

const taskStatusEnum = z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']);
const priorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

// ─── Create Task ──────────────────────────────────────────────────

export const createTaskSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(500),
  description: z.string().max(10000).optional(),
  status: taskStatusEnum.default('todo'),
  priority: priorityEnum.default('medium'),
  dueDate: z.coerce.date().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  estimatedHrs: z.coerce.number().min(0).max(9999).optional(),
  position: z.coerce.number().int().min(0).optional(),
});

// ─── Update Task ──────────────────────────────────────────────────

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: taskStatusEnum.optional(),
  priority: priorityEnum.optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  estimatedHrs: z.coerce.number().min(0).max(9999).optional().nullable(),
});

// ─── Update Status (Kanban drag-drop) ─────────────────────────────

export const updateStatusSchema = z.object({
  status: taskStatusEnum,
});

// ─── Assign Task ──────────────────────────────────────────────────

export const assignTaskSchema = z.object({
  assigneeId: z.string().uuid('Invalid assignee ID'),
});

// ─── Reorder Task ─────────────────────────────────────────────────

export const reorderTaskSchema = z.object({
  position: z.coerce.number().int().min(0),
});

// ─── Query Tasks ──────────────────────────────────────────────────

export const queryTasksSchema = z.object({
  status: taskStatusEnum.optional(),
  assigneeId: z.string().uuid().optional(),
  priority: priorityEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().max(200).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type ReorderTaskInput = z.infer<typeof reorderTaskSchema>;
export type QueryTasksInput = z.infer<typeof queryTasksSchema>;
