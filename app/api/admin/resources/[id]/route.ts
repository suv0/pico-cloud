import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { RenameResourceError, renameFailedResource } from '@/lib/resources/renameFailedResource';

const resourceInclude = {
  package: true,
  invoice: { select: { id: true, status: true, amountBdt: true } },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const resource = await db.resource.findUnique({
    where: { id },
    include: resourceInclude,
  });

  if (!resource) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(resource);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const resource = await db.resource.findUnique({ where: { id } });

  if (!resource) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const json = await readJsonBody(req);
  if (!json.ok) {
    return NextResponse.json({ error: json.error }, { status: 400 });
  }

  const body = json.body;
  if (typeof body !== 'object' || body === null || !('name' in body)) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const updated = await renameFailedResource(id, body.name, session.userId);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof RenameResourceError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error(`PATCH /api/admin/resources/${id} failed:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
