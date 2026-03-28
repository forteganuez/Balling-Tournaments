import prisma from './prisma.js';
import { logger } from './logger.js';
import type { Prisma } from '@prisma/client';

interface AuditLogInput {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Prisma.InputJsonValue;
}

const AUDIT_DATA = (input: AuditLogInput) => ({
  userId: input.userId,
  action: input.action,
  targetType: input.targetType,
  targetId: input.targetId,
  details: input.details ?? undefined,
});

/**
 * Log an admin or sensitive action for audit trail.
 * Retries once on failure. Never throws.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  const meta = { action: input.action, targetType: input.targetType, targetId: input.targetId };

  try {
    await prisma.auditLog.create({ data: AUDIT_DATA(input) });
  } catch (err) {
    logger.warn('Audit log failed, retrying', { ...meta, err: String(err) });

    try {
      await new Promise((r) => setTimeout(r, 500));
      await prisma.auditLog.create({ data: AUDIT_DATA(input) });
    } catch (retryErr) {
      logger.error('Audit log retry failed', { ...meta, err: String(retryErr) });
    }
  }
}
