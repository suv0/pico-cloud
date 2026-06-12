import type { Prisma, PrismaClient } from '@prisma/client';
import { ResourceStatus } from '@prisma/client';
import { assertValidTransition, canTransition } from '@/lib/provisioning/fsm';

export { canTransition };

type ResourceDb = Pick<PrismaClient, 'resource'>;

export type ResourceStatusUpdateData = Pick<
  Prisma.ResourceUpdateInput,
  'publicIp' | 'failureReason' | 'provisionedAt' | 'updatedAt'
>;

/**
 * Single choke point for VM status changes — validates FSM then writes.
 */
export async function transitionResourceStatus(
  db: ResourceDb,
  resourceId: string,
  to: ResourceStatus,
  extra: ResourceStatusUpdateData = {},
): Promise<ResourceStatus> {
  const resource = await db.resource.findUniqueOrThrow({ where: { id: resourceId } });
  const from = resource.status;
  assertValidTransition(from, to);

  await db.resource.update({
    where: { id: resourceId },
    data: {
      status: to,
      updatedAt: new Date(),
      ...extra,
    },
  });

  return to;
}

/**
 * Conditional transition — returns false if current status does not match `from`.
 */
export async function transitionResourceStatusIf(
  db: ResourceDb,
  resourceId: string,
  from: ResourceStatus,
  to: ResourceStatus,
  extra: ResourceStatusUpdateData = {},
): Promise<boolean> {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid FSM transition: ${from} → ${to}`);
  }

  const updated = await db.resource.updateMany({
    where: { id: resourceId, status: from },
    data: {
      status: to,
      updatedAt: new Date(),
      ...extra,
    },
  });

  return updated.count > 0;
}
