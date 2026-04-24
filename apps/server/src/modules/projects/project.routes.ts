import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validateRequest } from '../../middleware/validateRequest';
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  queryProjectsSchema,
} from './project.schemas';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} from './project.controller';

const router = Router();

// All project routes require authentication
router.use(authenticateToken);

// ─── Project CRUD ─────────────────────────────────────────────────

// GET  /api/v1/projects
router.get('/', validateRequest(queryProjectsSchema), listProjects);

// POST /api/v1/projects
router.post('/', requireRole('admin', 'manager'), validateRequest(createProjectSchema), createProject);

// GET  /api/v1/projects/:id
router.get('/:id', getProject);

// PUT  /api/v1/projects/:id
router.put('/:id', validateRequest(updateProjectSchema), updateProject);

// DELETE /api/v1/projects/:id
router.delete('/:id', requireRole('admin', 'manager'), deleteProject);

// ─── Member Management ───────────────────────────────────────────

// POST   /api/v1/projects/:id/members
router.post('/:id/members', requireRole('admin', 'manager'), validateRequest(addMemberSchema), addMember);

// DELETE /api/v1/projects/:id/members/:userId
router.delete('/:id/members/:userId', requireRole('admin', 'manager'), removeMember);

export default router;
