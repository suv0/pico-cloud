import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';
import { RetryProvisionError, retryProvision } from '@/lib/provisioning/retryProvision';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const resource = await db.resource.findUnique({ where: { id } });

  if (!resource || resource.userId !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    await retryProvision(id, session.userId);
    const updated = await db.resource.findUnique({
      where: { id },
      include: { package: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof RetryProvisionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(`POST /api/resources/${id}/retry failed:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
