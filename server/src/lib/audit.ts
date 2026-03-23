import prisma from './prisma.js';
import type { Prisma } from '@prisma/client';

interface AuditLogInput {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Prisma.InputJsonValue;
}

/**
 * Log an admin or sensitive action for audit trail.
 * Fire-and-forget — never throws.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        details: input.details ?? undefined,
      },
    });
  } catch (err) {
    // Best-effort logging — don't break the request if this fails
    console.error('Audit log failed:', err);
  }
}
