import { db } from '@/lib/db';
import { logEvent } from '@/lib/audit/logger';
import { runProvisionAsync } from '@/lib/provisioning/provisionService';
import { ResourceStatus } from '@prisma/client';
import { transitionResourceStatusIf } from '@/lib/provisioning/transitionResourceStatus';

export class RetryProvisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryProvisionError';
  }
}

export function canRetryProvision(status: ResourceStatus): boolean {
  return status === ResourceStatus.FAILED;
}

export async function retryProvision(resourceId: string, actorUserId: string): Promise<void> {
  const resource = await db.resource.findUnique({ where: { id: resourceId } });

  if (!resource) {
    throw new RetryProvisionError('Resource not found');
  }

  if (!canRetryProvision(resource.status)) {
    throw new RetryProvisionError('Only FAILED VMs can be retried');
  }

  const moved = await transitionResourceStatusIf(
    db,
    resourceId,
    ResourceStatus.FAILED,
    ResourceStatus.PENDING,
    {
      failureReason: null,
      publicIp: null,
      provisionedAt: null,
    },
  );

  if (!moved) {
    throw new RetryProvisionError('Only FAILED VMs can be retried');
  }

  await logEvent('resource', resourceId, 'RESOURCE_RETRY_REQUESTED', undefined, actorUserId);
  runProvisionAsync(resourceId);
}
