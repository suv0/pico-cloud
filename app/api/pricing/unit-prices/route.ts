import { NextResponse } from 'next/server';
import { loadUnitPricesFromDb, UnitPriceConfigurationError } from '@/lib/pricing/unitPricesFromDb';

export async function GET() {
  try {
    const prices = await loadUnitPricesFromDb();
    return NextResponse.json({
      vcpu: prices.vcpu,
      ram_gb: prices.ram_gb,
      storage_gb: prices.storage_gb,
    });
  } catch (err) {
    if (err instanceof UnitPriceConfigurationError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
}
