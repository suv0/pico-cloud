import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';
import { logEvent } from '@/lib/audit/logger';
import { PatchPackageBody } from '@/lib/api/adminSchemas';
import { readJsonBody } from '@/lib/api/readJsonBody';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getApiAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const json = await readJsonBody(req);
  if (!json.ok) {
    return NextResponse.json({ error: json.error }, { status: 400 });
  }

  const parsed = PatchPackageBody.safeParse(json.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const existing = await db.package.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  const updated = await db.package.update({
    where: { id },
    data: parsed.data,
  });

  await logEvent(
    'package',
    updated.id,
    'PACKAGE_UPDATED',
    `slug=${updated.slug}; price=৳${updated.monthlyPriceBdt}`,
    session.userId,
  );

  return NextResponse.json(updated);
}
