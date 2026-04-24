import prisma from '../config/db';
import { logger } from './logger';

// ─── Types ────────────────────────────────────────────────────────

type ActionType = 'CREATED' | 'UPDATED' | 'DELETED' | 'ASSIGNED' | 'REMOVED' | 'STATUS_CHANGED';
type EntityType = 'PROJECT' | 'TASK' | 'COMMENT' | 'MEMBER';

interface LogActivityParams {
  tenantId: string;
  actorId: string;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  changes?: Record<string, unknown>;
}

// ─── Activity Logger ──────────────────────────────────────────────

/**
 * Creates an immutable audit log entry for any CUD operation.
 *
 * Fire-and-forget by default — errors are logged but never bubble up
 * to block the main request flow.
 */
export async function logActivity({
  tenantId,
  actorId,
  action,
  entityType,
  entityId,
  changes,
}: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        tenantId,
        actorId,
        action,
        entityType: entityType.toLowerCase(),
        entityId,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
      },
    });
  } catch (error) {
    // Never let logging failures crash the request
    logger.error('Failed to write activity log', { error, tenantId, action, entityType, entityId });
  }
}
