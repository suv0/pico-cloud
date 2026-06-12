import type { PrismaClient } from '@prisma/client';
import { ResourceStatus } from '@prisma/client';
import { logEvent } from '@/lib/audit/logger';
import { transitionResourceStatus } from '@/lib/provisioning/transitionResourceStatus';

export const RECOVERY_FAILURE_REASON = 'Provisioning interrupted — please retry.';

type RecoveryDb = Pick<PrismaClient, 'resource'>;

/**
 * On container restart, in-process provision jobs are lost. Any VM still
 * PENDING or PROVISIONING has no active worker — mark FAILED so the customer
 * can retry. Called from prisma seed on every boot (before next start).
 */
export async function recoverInterruptedProvisions(db: RecoveryDb): Promise<number> {
  const stuck = await db.resource.findMany({
    where: { status: { in: [ResourceStatus.PENDING, ResourceStatus.PROVISIONING] } },
  });

  for (const resource of stuck) {
    await transitionResourceStatus(db, resource.id, ResourceStatus.FAILED, {
      failureReason: RECOVERY_FAILURE_REASON,
    });
    await logEvent(
      'resource',
      resource.id,
      'RESOURCE_PROVISIONING_FAILED',
      RECOVERY_FAILURE_REASON,
      resource.userId,
    );
  }

  return stuck.length;
}
