import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const events = await db.auditEvent.findMany({
    where: { entityId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(events);
}
