import { db } from '@/lib/db';
import { InvoiceStatus } from '@prisma/client';

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

export async function countBlockingUnpaidResources(userId: string): Promise<number> {
  const resources = await db.resource.findMany({
    where: {
      userId,
      status: { not: 'TERMINATED' },
    },
    include: { invoice: { select: { id: true, status: true } } },
  });

  return resources.filter(
    (r) => !r.invoice || r.invoice.status === InvoiceStatus.UNPAID,
  ).length;
}

export async function findBlockingResource(userId: string): Promise<{
  existingResourceId: string;
  invoiceId: string | null;
} | null> {
  const resources = await db.resource.findMany({
    where: {
      userId,
      status: { not: 'TERMINATED' },
    },
    include: { invoice: { select: { id: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const blocking = resources.find(
    (r) => !r.invoice || r.invoice.status === InvoiceStatus.UNPAID,
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
