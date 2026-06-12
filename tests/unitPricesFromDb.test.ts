import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loadUnitPricesFromDb, UnitPriceConfigurationError } from '@/lib/pricing/unitPricesFromDb';
import { PriceDimension } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  db: {
    unitPrice: {
      findMany: vi.fn(),
    },
  },
}));

import { db } from '@/lib/db';

const mockedFindMany = vi.mocked(db.unitPrice.findMany);

describe('loadUnitPricesFromDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws UnitPriceConfigurationError when a dimension is missing', async () => {
    mockedFindMany.mockResolvedValue([
      { dimension: PriceDimension.vcpu, pricePerUnitBdt: 500 },
    ] as never);

    await expect(loadUnitPricesFromDb()).rejects.toThrow(UnitPriceConfigurationError);
  });

  it('throws UnitPriceConfigurationError when a price is zero', async () => {
    mockedFindMany.mockResolvedValue([
      { dimension: PriceDimension.vcpu, pricePerUnitBdt: 500 },
      { dimension: PriceDimension.ram_gb, pricePerUnitBdt: 0 },
      { dimension: PriceDimension.storage_gb, pricePerUnitBdt: 10 },
    ] as never);

    await expect(loadUnitPricesFromDb()).rejects.toThrow(/ram_gb/i);
  });

  it('returns unit prices when all dimensions are configured', async () => {
    mockedFindMany.mockResolvedValue([
      { dimension: PriceDimension.vcpu, pricePerUnitBdt: 500 },
      { dimension: PriceDimension.ram_gb, pricePerUnitBdt: 200 },
      { dimension: PriceDimension.storage_gb, pricePerUnitBdt: 10 },
    ] as never);

    await expect(loadUnitPricesFromDb()).resolves.toEqual({
      vcpu: 500,
      ram_gb: 200,
      storage_gb: 10,
    });
  });
});
