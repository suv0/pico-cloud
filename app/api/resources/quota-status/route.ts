import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/apiSession';
import { findBlockingResource } from '@/lib/billing/unpaidQuota';

export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const blocking = await findBlockingResource(session.userId);

  return NextResponse.json(
    blocking
      ? { blocked: true, existingResourceId: blocking.existingResourceId, invoiceId: blocking.invoiceId }
      : { blocked: false },
  );
}
