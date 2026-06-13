import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';
import { logEvent } from '@/lib/audit/logger';
import { transitionResourceStatus } from '@/lib/provisioning/transitionResourceStatus';
import { ResourceStatus } from '@prisma/client';

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

  if (resource.status === 'PENDING' || resource.status === 'PROVISIONING') {
    return NextResponse.json({ error: 'Cannot terminate a VM that is still provisioning' }, { status: 409 });
  }

  if (resource.status === ResourceStatus.TERMINATED) {
    return NextResponse.json(resource);
  }

  await transitionResourceStatus(db, id, ResourceStatus.TERMINATED, { publicIp: null });

  await logEvent('resource', id, 'RESOURCE_TERMINATED', 'Terminated by customer', session.userId);

  const updated = await db.resource.findUnique({
    where: { id },
    include: { package: true, invoice: { select: { id: true, status: true } } },
  });

  return NextResponse.json(updated ?? resource);
}
