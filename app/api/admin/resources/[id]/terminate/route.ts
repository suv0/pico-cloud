import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';
import { logEvent } from '@/lib/audit/logger';

export async function POST(
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

  if (resource.status === 'TERMINATED') {
    return NextResponse.json(resource);
  }

  if (resource.status === 'PENDING' || resource.status === 'PROVISIONING') {
    return NextResponse.json({ error: 'Cannot terminate a VM that is still provisioning' }, { status: 409 });
  }

  await db.resource.update({
    where: { id },
    data: { status: 'TERMINATED', publicIp: null },
  });

  await logEvent('resource', id, 'RESOURCE_TERMINATED', 'Terminated by admin', session.userId);

  const updated = await db.resource.findUnique({
    where: { id },
    include: { package: true, invoice: { select: { id: true, status: true } } },
  });

  return NextResponse.json(updated);
}
