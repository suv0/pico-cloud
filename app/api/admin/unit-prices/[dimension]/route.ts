import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';
import { logEvent } from '@/lib/audit/logger';
import { isAdminUnitPriceDimension, PatchUnitPriceBody } from '@/lib/api/adminSchemas';
import { readJsonBody } from '@/lib/api/readJsonBody';

type RouteContext = { params: Promise<{ dimension: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getApiAdminSession();
  if (session instanceof NextResponse) return session;

  const { dimension } = await context.params;
  if (!isAdminUnitPriceDimension(dimension)) {
    return NextResponse.json({ error: 'Invalid dimension' }, { status: 400 });
  }

  const json = await readJsonBody(req);
  if (!json.ok) {
    return NextResponse.json({ error: json.error }, { status: 400 });
  }

  const parsed = PatchUnitPriceBody.safeParse(json.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const existing = await db.unitPrice.findUnique({ where: { dimension } });
  if (!existing) {
    return NextResponse.json({ error: 'Unit price not found' }, { status: 404 });
  }

  const updated = await db.unitPrice.update({
    where: { dimension },
    data: { pricePerUnitBdt: parsed.data.pricePerUnitBdt },
  });

  await logEvent(
    'unit_price',
    updated.id,
    'UNIT_PRICE_UPDATED',
    `${dimension}=৳${updated.pricePerUnitBdt}`,
    session.userId,
  );

  return NextResponse.json(updated);
}
