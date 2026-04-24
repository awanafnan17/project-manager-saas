import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validateRequest } from '../../middleware/validateRequest';
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  assignTaskSchema,
  reorderTaskSchema,
  queryTasksSchema,
} from './task.schemas';
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  reorderTask,
  deleteTask,
} from './task.controller';

const router = Router({ mergeParams: true });

// All task routes require authentication
router.use(authenticateToken);

// ─── Nested under /projects/:projectId/tasks ──────────────────────

// GET  /api/v1/projects/:projectId/tasks
router.get('/projects/:projectId/tasks', validateRequest(queryTasksSchema), listTasks);

// POST /api/v1/projects/:projectId/tasks
router.post('/projects/:projectId/tasks', validateRequest(createTaskSchema), createTask);

// ─── Direct task routes (/tasks/:id) ──────────────────────────────

// GET    /api/v1/tasks/:id
router.get('/tasks/:id', getTask);

// PUT    /api/v1/tasks/:id
router.put('/tasks/:id', validateRequest(updateTaskSchema), updateTask);

// PATCH  /api/v1/tasks/:id/status  (Kanban drag-drop)
router.patch('/tasks/:id/status', validateRequest(updateStatusSchema), updateTaskStatus);

// PATCH  /api/v1/tasks/:id/assign
router.patch('/tasks/:id/assign', validateRequest(assignTaskSchema), assignTask);

// PATCH  /api/v1/tasks/:id/reorder
router.patch('/tasks/:id/reorder', validateRequest(reorderTaskSchema), reorderTask);

// DELETE /api/v1/tasks/:id
router.delete('/tasks/:id', requireRole('admin', 'manager'), deleteTask);

export default router;
