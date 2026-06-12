import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';
import { calculatePackageUnitTotal } from '@/lib/pricing/packageUnitTotal';
import { loadUnitPricesFromDb, UnitPriceConfigurationError } from '@/lib/pricing/unitPricesFromDb';

export async function GET() {
  const session = await getApiAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const [packages, unitPrices] = await Promise.all([
      db.package.findMany({ orderBy: { monthlyPriceBdt: 'asc' } }),
      loadUnitPricesFromDb(),
    ]);

    const enriched = packages.map((pkg) => {
      const unitTotalBdt = calculatePackageUnitTotal(pkg, unitPrices);
      return {
        ...pkg,
        unitTotalBdt,
        priceDeltaBdt: pkg.monthlyPriceBdt - unitTotalBdt,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    if (err instanceof UnitPriceConfigurationError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
}
