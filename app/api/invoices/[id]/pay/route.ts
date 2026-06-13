import { NextRequest, NextResponse } from 'next/server';
import { ResourceStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';
import { logEvent } from '@/lib/audit/logger';
import { processMockPayment } from '@/lib/payment/mockGateway';
import { parsePaymentBody } from '@/lib/payment/parsePaymentBody';
import { mockPublicIp } from '@/lib/cloud/mockPublicIp';
import { transitionResourceStatus } from '@/lib/provisioning/transitionResourceStatus';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { resource: true },
  });

  if (!invoice || invoice.userId !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (invoice.status === 'PAID') {
    return NextResponse.json(invoice);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parsePaymentBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payment = await processMockPayment({
    ...parsed.data,
    amountBdt: invoice.amountBdt,
    invoiceId: invoice.id,
  });

  if (!payment.ok) {
    return NextResponse.json(
      { error: payment.message, code: payment.code },
      { status: 402 },
    );
  }

  const wasSuspended = invoice.resource.status === ResourceStatus.SUSPENDED;

  const updated = await db.$transaction(async (tx) => {
    const claim = await tx.invoice.updateMany({
      where: { id, status: 'UNPAID' },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentReference: payment.reference,
        cardLast4: payment.last4,
      },
    });

    if (claim.count === 0) {
      const current = await tx.invoice.findUnique({
        where: { id },
        include: { resource: true },
      });
      if (current?.status === 'PAID') return current;
      return null;
    }

    if (wasSuspended) {
      await transitionResourceStatus(tx, invoice.resource.id, ResourceStatus.ACTIVE, {
        publicIp: mockPublicIp(invoice.resource.id),
      });
    }

    return tx.invoice.findUnique({
      where: { id },
      include: { resource: true },
    });
  });

  if (!updated) {
    const current = await db.invoice.findUnique({
      where: { id },
      include: { resource: true },
    });
    if (current?.status === 'PAID') {
      return NextResponse.json(current);
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (wasSuspended) {
    await logEvent(
      'resource',
      invoice.resource.id,
      'RESOURCE_RESUMED',
      'Restored after payment',
      session.userId,
    );
  }

  await logEvent(
    'invoice',
    id,
    'INVOICE_PAID',
    `Ref: ${payment.reference} · ৳${invoice.amountBdt} · card ****${payment.last4}`,
    session.userId,
  );

  return NextResponse.json(updated);
}
