import { describe, expect, it } from 'vitest';
import {
  clampPackageNumericField,
  isAdminUnitPriceDimension,
  PatchPackageBody,
  PatchUnitPriceBody,
} from '@/lib/api/adminSchemas';

describe('PatchPackageBody', () => {
  const valid = {
    name: 'Starter',
    vcpu: 1,
    ramGb: 2,
    storageGb: 40,
    monthlyPriceBdt: 1500,
  };

  it('accepts valid package fields', () => {
    expect(PatchPackageBody.safeParse(valid).success).toBe(true);
  });

  it('rejects vCPU below minimum', () => {
    const result = PatchPackageBody.safeParse({ ...valid, vcpu: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects storage below 10 GB', () => {
    const result = PatchPackageBody.safeParse({ ...valid, storageGb: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects negative monthly price', () => {
    const result = PatchPackageBody.safeParse({ ...valid, monthlyPriceBdt: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects vCPU above maximum', () => {
    const result = PatchPackageBody.safeParse({ ...valid, vcpu: 130 });
    expect(result.success).toBe(false);
  });
});

describe('clampPackageNumericField', () => {
  it('clamps vCPU to schema max', () => {
    expect(clampPackageNumericField('vcpu', 130)).toBe(64);
    expect(clampPackageNumericField('vcpu', 0)).toBe(1);
  });

  it('clamps storage to schema bounds', () => {
    expect(clampPackageNumericField('storageGb', 5000)).toBe(2000);
    expect(clampPackageNumericField('storageGb', 5)).toBe(10);
  });
});

describe('PatchUnitPriceBody', () => {
  it('accepts positive unit price', () => {
    expect(PatchUnitPriceBody.safeParse({ pricePerUnitBdt: 500 }).success).toBe(true);
  });

  it('rejects zero unit price', () => {
    expect(PatchUnitPriceBody.safeParse({ pricePerUnitBdt: 0 }).success).toBe(false);
  });

  it('rejects negative unit price', () => {
    expect(PatchUnitPriceBody.safeParse({ pricePerUnitBdt: -10 }).success).toBe(false);
  });
});

describe('isAdminUnitPriceDimension', () => {
  it('accepts known dimensions', () => {
    expect(isAdminUnitPriceDimension('vcpu')).toBe(true);
    expect(isAdminUnitPriceDimension('ram_gb')).toBe(true);
    expect(isAdminUnitPriceDimension('storage_gb')).toBe(true);
  });

  it('rejects unknown dimensions', () => {
    expect(isAdminUnitPriceDimension('bandwidth')).toBe(false);
  });
});
