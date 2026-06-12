import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';
import { generateMockTelemetry } from '@/lib/metrics/mockTelemetry';

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

  if (resource.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Metrics available only for active VMs' }, { status: 400 });
  }

  const tick = Math.floor(Date.now() / 2000);
  return NextResponse.json(generateMockTelemetry(id, resource.vcpu, resource.ramGb, tick));
}
