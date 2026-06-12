/**
 * Pure pricing function — no DB calls, no side effects.
 *
 * Used in two contexts:
 *   1. Server-side (API routes): called with unit prices read from DB
 *   2. Client-side (custom configure page): called with unit prices
 *      fetched once from GET /api/pricing/unit-prices
 *
 * Expandability: add discountCode, taxRate, durationMonths parameters
 * here without changing callers.
 */
export type UnitPrices = {
  vcpu: number;
  ram_gb: number;
  storage_gb: number;
};

export type CustomSpec = {
  vcpu: number;
  ramGb: number;
  storageGb: number;
};

export function calculateCustomPrice(spec: CustomSpec, unitPrices: UnitPrices): number {
  return (
    spec.vcpu * unitPrices.vcpu +
    spec.ramGb * unitPrices.ram_gb +
    spec.storageGb * unitPrices.storage_gb
  );
}
