import { z } from 'zod';

/** Shared limits for admin package PATCH — used by API validation and PackageEditor inputs. */
export const PACKAGE_FIELD_LIMITS = {
  name: { minLength: 1, maxLength: 64 },
  vcpu: { min: 1, max: 64 },
  ramGb: { min: 1, max: 512 },
  storageGb: { min: 10, max: 2000 },
  monthlyPriceBdt: { min: 0 },
} as const;

export type PackageNumericField = keyof Pick<
  typeof PACKAGE_FIELD_LIMITS,
  'vcpu' | 'ramGb' | 'storageGb' | 'monthlyPriceBdt'
>;

export function clampPackageNumericField(field: PackageNumericField, value: number): number {
  const limits = PACKAGE_FIELD_LIMITS[field];
  const intValue = Math.trunc(value);
  if ('max' in limits && limits.max !== undefined) {
    return Math.min(limits.max, Math.max(limits.min, intValue));
  }
  return Math.max(limits.min, intValue);
}

export function truncatePackageName(value: string): string {
  return value.slice(0, PACKAGE_FIELD_LIMITS.name.maxLength);
}

export const PatchPackageBody = z.object({
  name: z
    .string()
    .min(PACKAGE_FIELD_LIMITS.name.minLength, 'Name is required')
    .max(PACKAGE_FIELD_LIMITS.name.maxLength),
  vcpu: z
    .number()
    .int()
    .min(PACKAGE_FIELD_LIMITS.vcpu.min, 'vCPU must be at least 1')
    .max(PACKAGE_FIELD_LIMITS.vcpu.max, `vCPU cannot exceed ${PACKAGE_FIELD_LIMITS.vcpu.max}`),
  ramGb: z
    .number()
    .int()
    .min(PACKAGE_FIELD_LIMITS.ramGb.min, 'RAM must be at least 1 GB')
    .max(PACKAGE_FIELD_LIMITS.ramGb.max, `RAM cannot exceed ${PACKAGE_FIELD_LIMITS.ramGb.max} GB`),
  storageGb: z
    .number()
    .int()
    .min(PACKAGE_FIELD_LIMITS.storageGb.min, 'Storage must be at least 10 GB')
    .max(
      PACKAGE_FIELD_LIMITS.storageGb.max,
      `Storage cannot exceed ${PACKAGE_FIELD_LIMITS.storageGb.max} GB`,
    ),
  monthlyPriceBdt: z
    .number()
    .int()
    .min(PACKAGE_FIELD_LIMITS.monthlyPriceBdt.min, 'Price cannot be negative'),
});

export const PatchUnitPriceBody = z.object({
  pricePerUnitBdt: z.number().int().min(1, 'Unit price must be at least 1 BDT'),
});

export const ADMIN_UNIT_PRICE_DIMENSIONS = ['vcpu', 'ram_gb', 'storage_gb'] as const;
export type AdminUnitPriceDimension = (typeof ADMIN_UNIT_PRICE_DIMENSIONS)[number];

export function isAdminUnitPriceDimension(value: string): value is AdminUnitPriceDimension {
  return (ADMIN_UNIT_PRICE_DIMENSIONS as readonly string[]).includes(value);
}
