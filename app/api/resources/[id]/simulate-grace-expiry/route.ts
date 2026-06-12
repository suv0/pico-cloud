import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';
import { enforcePaymentGraceForResource } from '@/lib/billing/enforcePaymentGrace';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const resource = await db.resource.findUnique({
    where: { id },
    include: { invoice: { select: { id: true, status: true } } },
  });

  if (!resource || resource.userId !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (resource.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Only active VMs can simulate grace expiry' }, { status: 400 });
  }

  if (!resource.invoice || resource.invoice.status !== 'UNPAID') {
    return NextResponse.json({ error: 'No unpaid invoice to expire' }, { status: 400 });
  }

  await db.invoice.update({
    where: { resourceId: id },
    data: { paymentDueAt: new Date(Date.now() - 1000) },
  });

  await enforcePaymentGraceForResource(id);

  const updated = await db.resource.findUnique({
    where: { id },
    include: { package: true, invoice: { select: { id: true, status: true, paymentDueAt: true } } },
  });

  return NextResponse.json(updated);
}
