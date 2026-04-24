import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service';

// ─── List Tasks ───────────────────────────────────────────────────

async function listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId } = req.user!;
    const projectId = req.params.projectId as string;
    const query = (req as any).validatedData;

    const result = await taskService.listTasks(projectId, tenantId, userId, query);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── Get Task ─────────────────────────────────────────────────────

async function getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId } = req.user!;
    const id = req.params.id as string;

    const task = await taskService.getTask(id, tenantId, userId);

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

// ─── Create Task ──────────────────────────────────────────────────

async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId } = req.user!;
    const data = (req as any).validatedData;

    // Override projectId from route param if present
    if (req.params.projectId) {
      data.projectId = req.params.projectId as string;
    }

    const task = await taskService.createTask(data, tenantId, userId);

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ─── Update Task ──────────────────────────────────────────────────

async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId, role } = req.user!;
    const id = req.params.id as string;
    const data = (req as any).validatedData;

    const task = await taskService.updateTask(id, data, tenantId, userId, role);

    res.status(200).json({
      success: true,
      data: task,
      message: 'Task updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ─── Update Task Status (Kanban) ──────────────────────────────────

async function updateTaskStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId } = req.user!;
    const id = req.params.id as string;
    const { status } = (req as any).validatedData;

    const task = await taskService.updateTaskStatus(id, status, tenantId, userId);

    res.status(200).json({
      success: true,
      data: task,
      message: `Task moved to ${status}`,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Assign Task ──────────────────────────────────────────────────

async function assignTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId } = req.user!;
    const id = req.params.id as string;
    const { assigneeId } = (req as any).validatedData;

    const task = await taskService.assignTask(id, assigneeId, tenantId, userId);

    res.status(200).json({
      success: true,
      data: task,
      message: 'Task assigned successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ─── Reorder Task ─────────────────────────────────────────────────

async function reorderTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId } = req.user!;
    const id = req.params.id as string;
    const { position } = (req as any).validatedData;

    const result = await taskService.reorderTask(id, position, tenantId, userId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── Delete Task ──────────────────────────────────────────────────

async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, tenantId, role } = req.user!;
    const id = req.params.id as string;

    const result = await taskService.deleteTask(id, tenantId, userId, role);

    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

// ─── Exports ──────────────────────────────────────────────────────

export {
  listTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  reorderTask,
  deleteTask,
};
