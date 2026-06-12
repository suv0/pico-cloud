import { db } from '@/lib/db';
import type { AuditAction, AuditEntityType } from '@prisma/client';

export type { AuditAction };

/**
 * Single logEvent() function — the only way audit events are written.
 *
 * Expandability: add notificationService.emit() or webhookService.deliver()
 * here without touching any caller.
 */
export async function logEvent(
  entityType: AuditEntityType,
  entityId: string,
  action: AuditAction,
  detail?: string,
  userId?: string,
): Promise<void> {
  await db.auditEvent.create({
    data: {
      entityType,
      entityId,
      action,
      detail: detail ?? null,
      userId: userId ?? null,
    },
  });
}
