import { db } from '@/lib/db';
import { InvoiceStatus, ResourceStatus } from '@prisma/client';

const BLOCKING_STATUSES: ResourceStatus[] = [ResourceStatus.ACTIVE, ResourceStatus.SUSPENDED];

export class UnpaidQuotaError extends Error {
  public existingResourceId: string;
  public invoiceId: string | null;

  constructor(existingResourceId: string, invoiceId: string | null) {
    super('PAYMENT_REQUIRED_FOR_NEW_VM');
    this.name = 'UnpaidQuotaError';
    this.existingResourceId = existingResourceId;
    this.invoiceId = invoiceId;
  }
}

export async function findBlockingResource(userId: string): Promise<{
  existingResourceId: string;
  invoiceId: string | null;
} | null> {
  const resources = await db.resource.findMany({
    where: {
      userId,
      status: { in: BLOCKING_STATUSES },
    },
    include: { invoice: { select: { id: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const blocking = resources.find(
    (r) => r.invoice?.status === InvoiceStatus.UNPAID,
  );

  if (!blocking) return null;

  return {
    existingResourceId: blocking.id,
    invoiceId: blocking.invoice?.id ?? null,
  };
}

export async function assertCanProvisionNewVm(userId: string): Promise<void> {
  const blocking = await findBlockingResource(userId);
  if (blocking) {
    throw new UnpaidQuotaError(blocking.existingResourceId, blocking.invoiceId);
  }
}
