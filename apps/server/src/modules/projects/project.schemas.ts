import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────

const projectStatusEnum = z.enum(['active', 'archived', 'completed']);
const priorityEnum = z.enum(['low', 'medium', 'high', 'critical']);
const memberRoleEnum = z.enum(['manager', 'member']);

// ─── Create Project ───────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().max(5000).optional(),
  status: projectStatusEnum.default('active'),
  priority: priorityEnum.default('medium'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) return data.endDate >= data.startDate;
    return true;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
);

// ─── Update Project ───────────────────────────────────────────────

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: projectStatusEnum.optional(),
  priority: priorityEnum.optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

// ─── Add Member ───────────────────────────────────────────────────

export const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: memberRoleEnum.default('member'),
});

// ─── Query Projects ───────────────────────────────────────────────

export const queryProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: projectStatusEnum.optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type QueryProjectsInput = z.infer<typeof queryProjectsSchema>;
