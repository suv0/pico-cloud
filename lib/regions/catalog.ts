export const REGION_CODES = ['bd-dhaka', 'bd-chittagong', 'bd-sylhet'] as const;

export type RegionCode = (typeof REGION_CODES)[number];

export const DEFAULT_REGION_CODE: RegionCode = 'bd-dhaka';

export type RegionDefinition = {
  code: RegionCode;
  label: string;
  mapAsset: string;
};

export const REGION_CATALOG: readonly RegionDefinition[] = [
  { code: 'bd-dhaka', label: 'Dhaka (BD-01)', mapAsset: '/regions/bd-dhaka.svg' },
  { code: 'bd-chittagong', label: 'Chittagong (BD-02)', mapAsset: '/regions/bd-chittagong.svg' },
  { code: 'bd-sylhet', label: 'Sylhet (BD-03)', mapAsset: '/regions/bd-sylhet.svg' },
] as const;

export function isValidRegionCode(code: string): code is RegionCode {
  return REGION_CODES.includes(code as RegionCode);
}

export function getRegion(code: string | null | undefined): RegionDefinition {
  const match = REGION_CATALOG.find((region) => region.code === code);
  if (match) return match;
  return {
    code: DEFAULT_REGION_CODE,
    label: 'Dhaka (BD-01)',
    mapAsset: '/regions/bd-dhaka.svg',
  };
}
