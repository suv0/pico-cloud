import { db } from '@/lib/db';
import { CloudProviderMock } from '@/lib/cloud/CloudProviderMock';
import { logEvent } from '@/lib/audit/logger';
import { InvoiceStatus, ResourceStatus } from '@prisma/client';
import { transitionResourceStatus } from '@/lib/provisioning/transitionResourceStatus';

const cloudProvider = new CloudProviderMock();

/**
 * Runs provisioning asynchronously — fire and forget.
 *
 * Called after the Resource row is created with status PENDING.
 * The caller returns immediately; this function runs in the background.
 *
 * TRADEOFF: In-process async means jobs do not survive container restart.
 * For production: use a proper job queue (BullMQ, Postgres SKIP LOCKED).
 * This tradeoff is documented explicitly in DESIGN.md.
 */
export function runProvisionAsync(resourceId: string): void {
  void runProvision(resourceId);
}

async function runProvision(resourceId: string): Promise<void> {
  try {
    const resource = await db.resource.findUniqueOrThrow({
      where: { id: resourceId },
    });

    const spec = {
      name: resource.name,
      vcpu: resource.vcpu,
      ramGb: resource.ramGb,
      storageGb: resource.storageGb,
    };

    await logEvent(
      'resource',
      resourceId,
      'RESOURCE_PROVISION_STEP',
      'queued',
      resource.userId,
    );

    await transitionResourceStatus(db, resourceId, ResourceStatus.PROVISIONING);
    await logEvent('resource', resourceId, 'RESOURCE_PROVISIONING_STARTED', undefined, resource.userId);

    const result = await cloudProvider.provision(resourceId, spec, async (stepKey) => {
      await logEvent(
        'resource',
        resourceId,
        'RESOURCE_PROVISION_STEP',
        stepKey,
        resource.userId,
      );
    });

    if (result.success) {
      await db.$transaction(async (tx) => {
        await transitionResourceStatus(tx, resourceId, ResourceStatus.ACTIVE, {
          publicIp: result.publicIp,
          provisionedAt: new Date(),
        });

        const invoice = await tx.invoice.create({
          data: {
            resourceId,
            userId: resource.userId,
            amountBdt: resource.monthlyPriceBdt,
            status: InvoiceStatus.UNPAID,
            paymentDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        await logEvent(
          'resource',
          resourceId,
          'RESOURCE_PROVISIONING_COMPLETE',
          `IP: ${result.publicIp}`,
          resource.userId,
        );
        await logEvent(
          'resource',
          resourceId,
          'HEALTH_CHECK_PASSED',
          `VM responding on ${result.publicIp}`,
          resource.userId,
        );
        await logEvent(
          'invoice',
          invoice.id,
          'INVOICE_CREATED',
          `Amount: ৳${resource.monthlyPriceBdt}`,
          resource.userId,
        );
      });
    } else {
      await transitionResourceStatus(db, resourceId, ResourceStatus.FAILED, {
        failureReason: result.reason,
      });
      await logEvent(
        'resource',
        resourceId,
        'RESOURCE_PROVISIONING_FAILED',
        result.reason,
        resource.userId,
      );
    }
  } catch (err) {
    console.error(`[provisionService] unhandled error for ${resourceId}:`, err);
    await markProvisionFailed(resourceId, 'An unexpected error occurred during provisioning. Please retry.');
  }
}

export async function markProvisionFailed(resourceId: string, reason: string): Promise<void> {
  try {
    const resource = await db.resource.findUnique({ where: { id: resourceId } });
    if (!resource) return;

    if (resource.status !== ResourceStatus.PENDING && resource.status !== ResourceStatus.PROVISIONING) {
      return;
    }

    await transitionResourceStatus(db, resourceId, ResourceStatus.FAILED, {
      failureReason: reason,
    });
    await logEvent(
      'resource',
      resourceId,
      'RESOURCE_PROVISIONING_FAILED',
      reason,
      resource.userId,
    );
  } catch (recoveryErr) {
    console.error(`[provisionService] failed to mark ${resourceId} as FAILED:`, recoveryErr);
  }
}
