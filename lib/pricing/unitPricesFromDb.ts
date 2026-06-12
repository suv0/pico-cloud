import { db } from '@/lib/db';
import type { UnitPrices } from '@/lib/pricing/estimator';
import { PriceDimension } from '@prisma/client';

export class UnitPriceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitPriceConfigurationError';
  }
}

const REQUIRED_DIMENSIONS: PriceDimension[] = [
  PriceDimension.vcpu,
  PriceDimension.ram_gb,
  PriceDimension.storage_gb,
];

export async function loadUnitPricesFromDb(): Promise<UnitPrices> {
  const rows = await db.unitPrice.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.dimension, r.pricePerUnitBdt])) as Partial<
    Record<PriceDimension, number>
  >;

  for (const dimension of REQUIRED_DIMENSIONS) {
    const price = map[dimension];
    if (price === undefined || price <= 0) {
      throw new UnitPriceConfigurationError(
        `Unit price for "${dimension}" is missing or invalid. Check admin pricing or seed data.`,
      );
    }
  }

  return {
    vcpu: map[PriceDimension.vcpu]!,
    ram_gb: map[PriceDimension.ram_gb]!,
    storage_gb: map[PriceDimension.storage_gb]!,
  };
}
