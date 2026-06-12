import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { calculateCustomPrice } from '@/lib/pricing/estimator';
import { loadUnitPricesFromDb, UnitPriceConfigurationError } from '@/lib/pricing/unitPricesFromDb';
import { readJsonBody } from '@/lib/api/readJsonBody';

const FixedBody = z.object({
  packageId: z.string(),
});

const CustomBody = z.object({
  vcpu: z.number().int().min(1).max(16),
  ramGb: z.number().int().min(2).max(64),
  storageGb: z.number().int().min(40).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const json = await readJsonBody(req);
    if (!json.ok) {
      return NextResponse.json({ error: json.error }, { status: 400 });
    }
    const body = json.body;

    // Try fixed package estimate first
    const fixedParsed = FixedBody.safeParse(body);
    if (fixedParsed.success) {
      const pkg = await db.package.findUnique({ where: { id: fixedParsed.data.packageId } });
      if (!pkg) {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }
      return NextResponse.json({
        monthlyBdt: pkg.monthlyPriceBdt,
        currency: 'BDT',
        label: pkg.name,
      });
    }

    // Try custom spec estimate
    const customParsed = CustomBody.safeParse(body);
    if (customParsed.success) {
      const unitPrices = await loadUnitPricesFromDb();
      const monthlyBdt = calculateCustomPrice(customParsed.data, unitPrices);
      return NextResponse.json({
        monthlyBdt,
        currency: 'BDT',
        label: 'Custom',
      });
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (err) {
    if (err instanceof UnitPriceConfigurationError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('POST /api/pricing/estimate failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
