import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';

export async function GET(
  _req: NextRequest,
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

  return NextResponse.json(invoice);
}
