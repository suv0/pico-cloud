'use client';

import { REGION_CATALOG, type RegionCode } from '@/lib/regions/catalog';

type RegionSelectProps = {
  value: RegionCode;
  onChange: (code: RegionCode) => void;
};

export function RegionSelect({ value, onChange }: RegionSelectProps) {
  return (
    <div>
      <label htmlFor="region-code" className="mb-2 block font-body-sm text-body-sm font-semibold text-on-surface">
        Region
      </label>
      <select
        id="region-code"
        value={value}
        onChange={(e) => onChange(e.target.value as RegionCode)}
        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-base text-body-base text-on-surface outline-none focus:border-primary"
      >
        {REGION_CATALOG.map((region) => (
          <option key={region.code} value={region.code}>
            {region.label}
          </option>
        ))}
      </select>
      <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
        VM will be provisioned in the selected Bangladesh data centre.
      </p>
    </div>
  );
}
