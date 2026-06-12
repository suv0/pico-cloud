import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';

export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const invoices = await db.invoice.findMany({
    where: { userId: session.userId },
    include: { resource: { select: { name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(invoices);
}
