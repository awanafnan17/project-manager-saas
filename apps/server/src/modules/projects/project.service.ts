import prisma from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../utils/activityLogger';
import { logger } from '../../utils/logger';
import type { CreateProjectInput, UpdateProjectInput, AddMemberInput, QueryProjectsInput } from './project.schemas';

// ─── Project Service ──────────────────────────────────────────────

class ProjectService {

  // ── List Projects (with pagination & search) ──────────────────

  async listProjects(tenantId: string, userId: string, query: QueryProjectsInput) {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    // Only show projects where user is a member or owner
    const where: any = {
      tenantId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    // If both status and search are provided, combine with AND
    if (status && search) {
      where.AND = [
        { status },
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      ];
      delete where.status;
      delete where.OR;
      // Keep the membership filter
      where.AND.push({
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      });
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
          _count: {
            select: { members: true, tasks: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      projects,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Get Single Project ────────────────────────────────────────

  async getProject(id: string, tenantId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Check membership
    const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new AppError('You do not have access to this project', 403);
    }

    // Get task counts grouped by status
    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId: id, tenantId },
      _count: { status: true },
    });

    return {
      ...project,
      taskStats: taskStats.map((s) => ({ status: s.status, count: s._count.status })),
    };
  }

  // ── Create Project ────────────────────────────────────────────

  async createProject(data: CreateProjectInput, tenantId: string, ownerId: string) {
    const project = await prisma.$transaction(async (tx) => {
      // Create the project
      const newProject = await tx.project.create({
        data: {
          tenantId,
          ownerId,
          name: data.name,
          description: data.description,
          status: data.status || 'active',
          priority: data.priority || 'medium',
          startDate: data.startDate,
          endDate: data.endDate,
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
        },
      });

      // Add owner as project member with manager role
      await tx.projectMember.create({
        data: {
          projectId: newProject.id,
          userId: ownerId,
          role: 'manager',
        },
      });

      return newProject;
    });

    // Log activity (fire-and-forget)
    logActivity({
      tenantId,
      actorId: ownerId,
      action: 'CREATED',
      entityType: 'PROJECT',
      entityId: project.id,
      changes: { name: data.name },
    });

    logger.info(`Project created — name="${data.name}" id=${project.id} tenant=${tenantId}`);

    return project;
  }

  // ── Update Project ────────────────────────────────────────────

  async updateProject(id: string, data: UpdateProjectInput, tenantId: string, userId: string, userRole: string) {
    const project = await prisma.project.findFirst({ where: { id, tenantId } });
    if (!project) throw new AppError('Project not found', 404);

    // Only owner, admin, or manager can update
    const isOwner = project.ownerId === userId;
    const isPrivileged = ['admin', 'manager'].includes(userRole);
    if (!isOwner && !isPrivileged) {
      throw new AppError('Only the project owner or admins can update this project', 403);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        _count: { select: { members: true, tasks: true } },
      },
    });

    logActivity({
      tenantId,
      actorId: userId,
      action: 'UPDATED',
      entityType: 'PROJECT',
      entityId: id,
      changes: data as Record<string, unknown>,
    });

    return updated;
  }

  // ── Delete Project ────────────────────────────────────────────

  async deleteProject(id: string, tenantId: string, userId: string, userRole: string) {
    const project = await prisma.project.findFirst({ where: { id, tenantId } });
    if (!project) throw new AppError('Project not found', 404);

    const isOwner = project.ownerId === userId;
    const isAdmin = userRole === 'admin';
    if (!isOwner && !isAdmin) {
      throw new AppError('Only the project owner or admins can delete projects', 403);
    }

    // Soft delete — archive the project
    await prisma.project.update({
      where: { id },
      data: { status: 'archived' },
    });

    logActivity({
      tenantId,
      actorId: userId,
      action: 'DELETED',
      entityType: 'PROJECT',
      entityId: id,
      changes: { name: project.name },
    });

    logger.info(`Project archived — id=${id} name="${project.name}" by=${userId}`);

    return { message: `Project "${project.name}" has been archived` };
  }

  // ── Add Member ────────────────────────────────────────────────

  async addMember(projectId: string, data: AddMemberInput, tenantId: string, requesterId: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new AppError('Project not found', 404);

    // Verify the target user exists in the same tenant
    const targetUser = await prisma.user.findFirst({
      where: { id: data.userId, tenantId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!targetUser) {
      throw new AppError('User not found in your organization', 404);
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: data.userId } },
    });
    if (existingMember) {
      throw new AppError('User is already a member of this project', 409);
    }

    // Add member
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: data.userId,
        role: data.role,
      },
    });

    // Create notification for the added user
    await prisma.notification.create({
      data: {
        tenantId,
        recipientId: data.userId,
        type: 'project_invite',
        title: 'Added to project',
        body: `You have been added to "${project.name}" as ${data.role}`,
        resourceType: 'project',
        resourceId: projectId,
      },
    });

    logActivity({
      tenantId,
      actorId: requesterId,
      action: 'ASSIGNED',
      entityType: 'MEMBER',
      entityId: projectId,
      changes: { userId: data.userId, role: data.role, userName: `${targetUser.firstName} ${targetUser.lastName}` },
    });

    // Return updated member list
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true },
        },
      },
    });

    return members;
  }

  // ── Remove Member ─────────────────────────────────────────────

  async removeMember(projectId: string, userId: string, tenantId: string, requesterId: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new AppError('Project not found', 404);

    // Prevent removing the project owner
    if (project.ownerId === userId) {
      throw new AppError('Cannot remove the project owner', 400);
    }

    // Find the membership
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership) {
      throw new AppError('User is not a member of this project', 404);
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    logActivity({
      tenantId,
      actorId: requesterId,
      action: 'REMOVED',
      entityType: 'MEMBER',
      entityId: projectId,
      changes: { removedUserId: userId },
    });

    return { message: 'Member removed from project' };
  }
}

// ─── Export Singleton ─────────────────────────────────────────────

export const projectService = new ProjectService();
