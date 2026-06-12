import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';
import { generateMockTelemetry } from '@/lib/metrics/mockTelemetry';
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
    return NextResponse.json({ error: 'Metrics available only for active VMs' }, { status: 400 });
  }

  if (isPaymentRequired(resource)) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 });
  }

  const tick = Math.floor(Date.now() / 2000);
  return NextResponse.json(generateMockTelemetry(id, resource.vcpu, resource.ramGb, tick));
}
