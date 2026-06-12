import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';
import { buildUsageResponse } from '@/lib/metrics/usageForResource';
import { USAGE_MAX_DAYS } from '@/lib/metrics/usageHistory';
import { isPaymentRequired } from '@/lib/billing/isPaymentRequired';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const resource = await db.resource.findUnique({
    where: { id },
    include: { invoice: { select: { status: true } } },
  });

  if (!resource || resource.userId !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (resource.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Usage available only for active VMs' }, { status: 400 });
  }

  if (isPaymentRequired(resource)) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 });
  }

  const maxLookback = new Date(Date.now() - USAGE_MAX_DAYS * 24 * 3_600_000);
  const since =
    resource.provisionedAt && resource.provisionedAt > maxLookback
      ? resource.provisionedAt
      : maxLookback;

  const dbBuckets = await db.usageRecord.findMany({
    where: { resourceId: id, bucketStart: { gte: since } },
    orderBy: { bucketStart: 'asc' },
  });

  return NextResponse.json(
    buildUsageResponse(
      {
        id: resource.id,
        vcpu: resource.vcpu,
        ramGb: resource.ramGb,
        provisionedAt: resource.provisionedAt,
      },
      dbBuckets,
    ),
  );
}
