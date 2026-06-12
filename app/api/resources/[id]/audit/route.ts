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

  // Verify resource belongs to this user first
  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource || resource.userId !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const events = await db.auditEvent.findMany({
    where: { entityId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(events);
}
