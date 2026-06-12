import { db } from '@/lib/db';
import { ResourceStatus, InvoiceStatus } from '@prisma/client';
import { logEvent } from '@/lib/audit/logger';
import { transitionResourceStatus } from '@/lib/provisioning/transitionResourceStatus';

export async function enforcePaymentGraceForResource(resourceId: string): Promise<boolean> {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: { invoice: { select: { id: true, status: true, paymentDueAt: true } } },
  });

  if (!resource) return false;

  if (resource.status !== ResourceStatus.ACTIVE) return false;

  if (!resource.invoice) return false;

  if (resource.invoice.status !== InvoiceStatus.UNPAID) return false;

  if (!resource.invoice.paymentDueAt) return false;

  if (new Date() <= resource.invoice.paymentDueAt) return false;

  await transitionResourceStatus(db, resourceId, ResourceStatus.SUSPENDED, {
    publicIp: null,
  });

  await logEvent(
    'resource',
    resourceId,
    'INVOICE_GRACE_EXPIRED',
    `Payment due by ${resource.invoice.paymentDueAt.toISOString()} — suspended`,
    resource.userId,
  );

  return true;
}

export async function enforcePaymentGraceForUser(userId: string): Promise<number> {
  const resources = await db.resource.findMany({
    where: {
      userId,
      status: ResourceStatus.ACTIVE,
      invoice: { status: InvoiceStatus.UNPAID },
    },
    include: { invoice: { select: { paymentDueAt: true } } },
  });

  let suspended = 0;

  for (const resource of resources) {
    if (resource.invoice?.paymentDueAt && new Date() > resource.invoice.paymentDueAt) {
      const ok = await enforcePaymentGraceForResource(resource.id);
      if (ok) suspended++;
    }
  }

  return suspended;
}

export async function enforcePaymentGraceBatch(): Promise<number> {
  const resources = await db.resource.findMany({
    where: {
      status: ResourceStatus.ACTIVE,
      invoice: { status: InvoiceStatus.UNPAID },
    },
    include: { invoice: { select: { paymentDueAt: true } } },
  });

  let suspended = 0;

  for (const resource of resources) {
    if (resource.invoice?.paymentDueAt && new Date() > resource.invoice.paymentDueAt) {
      const ok = await enforcePaymentGraceForResource(resource.id);
      if (ok) suspended++;
    }
  }

  return suspended;
}
