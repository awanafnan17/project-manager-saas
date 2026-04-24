import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';

// ─── List Projects ────────────────────────────────────────────────

async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId } = req.user!;
    const query = (req as any).validatedData;

    const result = await projectService.listProjects(tenantId, userId, query);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── Get Project ──────────────────────────────────────────────────

async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId } = req.user!;
    const id = req.params.id as string;

    const project = await projectService.getProject(id, tenantId, userId);

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
}

// ─── Create Project ───────────────────────────────────────────────

async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId } = req.user!;
    const data = (req as any).validatedData;

    const project = await projectService.createProject(data, tenantId, userId);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ─── Update Project ───────────────────────────────────────────────

async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId, role } = req.user!;
    const id = req.params.id as string;
    const data = (req as any).validatedData;

    const project = await projectService.updateProject(id, data, tenantId, userId, role);

    res.status(200).json({
      success: true,
      data: project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ─── Delete Project ───────────────────────────────────────────────

async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId, role } = req.user!;
    const id = req.params.id as string;

    const result = await projectService.deleteProject(id, tenantId, userId, role);

    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

// ─── Add Member ───────────────────────────────────────────────────

async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: requesterId, tenantId } = req.user!;
    const projectId = req.params.id as string;
    const data = (req as any).validatedData;

    const members = await projectService.addMember(projectId, data, tenantId, requesterId);

    res.status(201).json({
      success: true,
      data: members,
      message: 'Member added successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ─── Remove Member ────────────────────────────────────────────────

async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: requesterId, tenantId } = req.user!;
    const projectId = req.params.id as string;
    const userId = req.params.userId as string;

    const result = await projectService.removeMember(projectId, userId, tenantId, requesterId);

    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

// ─── Exports ──────────────────────────────────────────────────────

export {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
