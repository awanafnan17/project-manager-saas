import prisma from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../utils/activityLogger';
import { logger } from '../../utils/logger';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  QueryTasksInput,
} from './task.schemas';

// ─── Helpers ──────────────────────────────────────────────────────

/** Verify user is a member of the task's project */
async function assertProjectMember(projectId: string, userId: string, tenantId: string) {
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
      project: { tenantId },
    },
  });
  if (!membership) {
    throw new AppError('You are not a member of this project', 403);
  }
  return membership;
}

/** Create a notification (fire-and-forget) */
async function notify(
  tenantId: string,
  recipientId: string,
  type: string,
  title: string,
  body: string,
  resourceType: string,
  resourceId: string
) {
  try {
    await prisma.notification.create({
      data: { tenantId, recipientId, type, title, body, resourceType, resourceId },
    });
  } catch (error) {
    logger.error('Failed to create notification', { error });
  }
}

// ─── Task Service ─────────────────────────────────────────────────

class TaskService {

  // ── List Tasks ────────────────────────────────────────────────

  async listTasks(projectId: string, tenantId: string, userId: string, query: QueryTasksInput) {
    // Verify project exists and user has access
    await assertProjectMember(projectId, userId, tenantId);

    const { status, assigneeId, priority, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      projectId,
      tenantId,
      ...(status && { status }),
      ...(assigneeId && { assigneeId }),
      ...(priority && { priority }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
          reporter: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
          taskLabels: {
            include: {
              label: { select: { id: true, name: true, color: true } },
            },
          },
          _count: { select: { comments: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return {
      tasks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Get Single Task ───────────────────────────────────────────

  async getTask(id: string, tenantId: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: { id, tenantId },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        project: {
          select: { id: true, name: true, status: true },
        },
        taskLabels: {
          include: {
            label: { select: { id: true, name: true, color: true } },
          },
        },
        comments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        _count: { select: { comments: true, subtasks: true } },
      },
    });

    if (!task) throw new AppError('Task not found', 404);

    // Verify access through project membership
    await assertProjectMember(task.projectId, userId, tenantId);

    return task;
  }

  // ── Create Task ───────────────────────────────────────────────

  async createTask(data: CreateTaskInput, tenantId: string, reporterId: string) {
    // Verify reporter is a project member
    await assertProjectMember(data.projectId, reporterId, tenantId);

    // If assignee provided, verify they're a project member
    if (data.assigneeId) {
      await assertProjectMember(data.projectId, data.assigneeId, tenantId);
    }

    // Get max position for auto-ordering
    const maxPos = await prisma.task.aggregate({
      where: { projectId: data.projectId, tenantId },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        tenantId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        dueDate: data.dueDate,
        assigneeId: data.assigneeId ?? null,
        reporterId,
        estimatedHrs: data.estimatedHrs,
        position: data.position ?? (maxPos._max.position ?? -1) + 1,
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        taskLabels: {
          include: { label: true },
        },
      },
    });

    // Log activity
    logActivity({
      tenantId,
      actorId: reporterId,
      action: 'CREATED',
      entityType: 'TASK',
      entityId: task.id,
      changes: { title: data.title, projectId: data.projectId },
    });

    // Notify assignee
    if (data.assigneeId && data.assigneeId !== reporterId) {
      notify(
        tenantId,
        data.assigneeId,
        'task_assigned',
        'New task assigned',
        `You have been assigned: "${data.title}"`,
        'task',
        task.id
      );
    }

    logger.info(`Task created — title="${data.title}" id=${task.id} project=${data.projectId}`);

    return task;
  }

  // ── Update Task ───────────────────────────────────────────────

  async updateTask(id: string, data: UpdateTaskInput, tenantId: string, userId: string, userRole: string) {
    const task = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new AppError('Task not found', 404);

    // Check permission: assignee, reporter, or manager/admin
    const isAssignee = task.assigneeId === userId;
    const isReporter = task.reporterId === userId;
    const isPrivileged = ['admin', 'manager'].includes(userRole);
    if (!isAssignee && !isReporter && !isPrivileged) {
      throw new AppError('You do not have permission to update this task', 403);
    }

    const previousAssignee = task.assigneeId;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.estimatedHrs !== undefined && { estimatedHrs: data.estimatedHrs }),
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        taskLabels: {
          include: { label: true },
        },
      },
    });

    // Log activity
    logActivity({
      tenantId,
      actorId: userId,
      action: data.status ? 'STATUS_CHANGED' : 'UPDATED',
      entityType: 'TASK',
      entityId: id,
      changes: data as Record<string, unknown>,
    });

    // Notify new assignee
    if (data.assigneeId && data.assigneeId !== previousAssignee && data.assigneeId !== userId) {
      notify(
        tenantId,
        data.assigneeId,
        'task_assigned',
        'Task assigned to you',
        `You have been assigned: "${updated.title}"`,
        'task',
        id
      );
    }

    return updated;
  }

  // ── Update Task Status (Kanban) ───────────────────────────────

  async updateTaskStatus(id: string, status: string, tenantId: string, userId: string) {
    const task = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new AppError('Task not found', 404);

    // Any project member can update status
    await assertProjectMember(task.projectId, userId, tenantId);

    const previousStatus = task.status;

    const updated = await prisma.task.update({
      where: { id },
      data: { status },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });

    logActivity({
      tenantId,
      actorId: userId,
      action: 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: id,
      changes: { from: previousStatus, to: status },
    });

    // Notify assignee if someone else changed the status
    if (task.assigneeId && task.assigneeId !== userId) {
      notify(
        tenantId,
        task.assigneeId,
        'task_status_changed',
        'Task status updated',
        `"${task.title}" moved from ${previousStatus} to ${status}`,
        'task',
        id
      );
    }

    return updated;
  }

  // ── Assign Task ───────────────────────────────────────────────

  async assignTask(id: string, assigneeId: string, tenantId: string, userId: string) {
    const task = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new AppError('Task not found', 404);

    // Verify assignee is a project member
    await assertProjectMember(task.projectId, assigneeId, tenantId);

    const updated = await prisma.task.update({
      where: { id },
      data: { assigneeId },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });

    logActivity({
      tenantId,
      actorId: userId,
      action: 'ASSIGNED',
      entityType: 'TASK',
      entityId: id,
      changes: { assigneeId, previousAssignee: task.assigneeId },
    });

    if (assigneeId !== userId) {
      notify(
        tenantId,
        assigneeId,
        'task_assigned',
        'Task assigned to you',
        `You have been assigned: "${task.title}"`,
        'task',
        id
      );
    }

    return updated;
  }

  // ── Reorder Task ──────────────────────────────────────────────

  async reorderTask(id: string, newPosition: number, tenantId: string, userId: string) {
    const task = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new AppError('Task not found', 404);

    await assertProjectMember(task.projectId, userId, tenantId);

    await prisma.task.update({
      where: { id },
      data: { position: newPosition },
    });

    return { message: 'Task position updated', position: newPosition };
  }

  // ── Delete Task ───────────────────────────────────────────────

  async deleteTask(id: string, tenantId: string, userId: string, userRole: string) {
    const task = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new AppError('Task not found', 404);

    // Only reporter, admin, or manager can delete
    const isReporter = task.reporterId === userId;
    const isPrivileged = ['admin', 'manager'].includes(userRole);
    if (!isReporter && !isPrivileged) {
      throw new AppError('Only the task reporter or admins can delete tasks', 403);
    }

    await prisma.task.delete({ where: { id } });

    logActivity({
      tenantId,
      actorId: userId,
      action: 'DELETED',
      entityType: 'TASK',
      entityId: id,
      changes: { title: task.title, projectId: task.projectId },
    });

    logger.info(`Task deleted — id=${id} title="${task.title}" by=${userId}`);

    return { message: `Task "${task.title}" deleted` };
  }
}

// ─── Export Singleton ─────────────────────────────────────────────

export const taskService = new TaskService();
