import { calculateCustomPrice, type UnitPrices } from '@/lib/pricing/estimator';

export type PackageSpec = {
  vcpu: number;
  ramGb: number;
  storageGb: number;
};

/**
 * Raw unit-rate total for a fixed package — used in admin console to show
 * how far the listed monthly price deviates from per-dimension rates.
 */
export function calculatePackageUnitTotal(spec: PackageSpec, unitPrices: UnitPrices): number {
  return calculateCustomPrice(
    { vcpu: spec.vcpu, ramGb: spec.ramGb, storageGb: spec.storageGb },
    unitPrices,
  );
}
