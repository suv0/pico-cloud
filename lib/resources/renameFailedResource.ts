import { ResourceStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logEvent } from '@/lib/audit/logger';
import { vmNameSchema } from '@/lib/validation/vmNameSchema';

export class RenameResourceError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 404 | 409 = 400,
  ) {
    super(message);
    this.name = 'RenameResourceError';
  }
}

export async function renameFailedResource(
  resourceId: string,
  rawName: unknown,
  actorUserId?: string,
) {
  const parsed = vmNameSchema.safeParse(rawName);
  if (!parsed.success) {
    throw new RenameResourceError(parsed.error.errors[0]?.message ?? 'Invalid VM name');
  }

  const name = parsed.data;
  const resource = await db.resource.findUnique({ where: { id: resourceId } });

  if (!resource) {
    throw new RenameResourceError('Not found', 404);
  }

  if (resource.status !== ResourceStatus.FAILED) {
    throw new RenameResourceError('Only failed VMs can be renamed');
  }

  if (resource.name === name) {
    return resource;
  }

  const duplicate = await db.resource.findUnique({
    where: { userId_name: { userId: resource.userId, name } },
  });
  if (duplicate) {
    throw new RenameResourceError('You already have a VM with that name', 409);
  }

  const updated = await db.resource.update({
    where: { id: resourceId },
    data: { name },
    include: {
      package: true,
      invoice: { select: { id: true, status: true } },
    },
  });

  await logEvent(
    'resource',
    resourceId,
    'RESOURCE_RENAMED',
    `${resource.name} → ${name}`,
    actorUserId ?? resource.userId,
  );

  return updated;
}
