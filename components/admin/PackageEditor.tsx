'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AdminSaveSuccessBanner } from '@/components/admin/AdminSaveSuccessBanner';
import { AdminRowStatusCell } from '@/components/admin/AdminRowStatusCell';
import { calculatePackageUnitTotal } from '@/lib/pricing/packageUnitTotal';
import type { UnitPrices } from '@/lib/pricing/estimator';
import {
  clampPackageNumericField,
  PACKAGE_FIELD_LIMITS,
  truncatePackageName,
  type PackageNumericField,
} from '@/lib/api/adminSchemas';

type AdminPackage = {
  id: string;
  slug: string;
  name: string;
  vcpu: number;
  ramGb: number;
  storageGb: number;
  monthlyPriceBdt: number;
  unitTotalBdt: number;
  priceDeltaBdt: number;
};

type EditableFields = Pick<AdminPackage, 'name' | 'vcpu' | 'ramGb' | 'storageGb' | 'monthlyPriceBdt'>;

type RowState = EditableFields & { saving: boolean; message: string | null; error: string | null };

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

function toRowState(pkg: AdminPackage): RowState {
  return {
    name: pkg.name,
    vcpu: pkg.vcpu,
    ramGb: pkg.ramGb,
    storageGb: pkg.storageGb,
    monthlyPriceBdt: pkg.monthlyPriceBdt,
    saving: false,
    message: null,
    error: null,
  };
}

function previewUnitTotal(row: EditableFields, unitPrices: UnitPrices | null): number | null {
  if (!unitPrices) return null;
  return calculatePackageUnitTotal(
    { vcpu: row.vcpu, ramGb: row.ramGb, storageGb: row.storageGb },
    unitPrices,
  );
}

function hasPackageDraftChanged(pkg: AdminPackage, row?: RowState): boolean {
  if (!row) return false;
  return (
    row.name !== pkg.name ||
    row.vcpu !== pkg.vcpu ||
    row.ramGb !== pkg.ramGb ||
    row.storageGb !== pkg.storageGb ||
    row.monthlyPriceBdt !== pkg.monthlyPriceBdt
  );
}

function enrichPackage(pkg: AdminPackage, unitPrices: UnitPrices | null): AdminPackage {
  const unitTotalBdt = previewUnitTotal(pkg, unitPrices) ?? pkg.unitTotalBdt;
  return {
    ...pkg,
    unitTotalBdt,
    priceDeltaBdt: pkg.monthlyPriceBdt - unitTotalBdt,
  };
}

export function PackageEditor() {
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [unitPrices, setUnitPrices] = useState<UnitPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [pkgRes, priceRes] = await Promise.all([
        fetch('/api/admin/packages'),
        fetch('/api/admin/unit-prices'),
      ]);
      const pkgData: unknown = await pkgRes.json();
      const priceData: unknown = await priceRes.json();

      if (!pkgRes.ok) {
        setLoadError((pkgData as { error?: string }).error ?? 'Failed to load packages');
        return;
      }
      if (!priceRes.ok) {
        setLoadError((priceData as { error?: string }).error ?? 'Failed to load unit prices');
        return;
      }

      const list = pkgData as AdminPackage[];
      const priceRows = priceData as { dimension: string; pricePerUnitBdt: number }[];
      const prices: UnitPrices = {
        vcpu: priceRows.find((r) => r.dimension === 'vcpu')?.pricePerUnitBdt ?? 0,
        ram_gb: priceRows.find((r) => r.dimension === 'ram_gb')?.pricePerUnitBdt ?? 0,
        storage_gb: priceRows.find((r) => r.dimension === 'storage_gb')?.pricePerUnitBdt ?? 0,
      };

      setPackages(list);
      setUnitPrices(prices);
      setRows(Object.fromEntries(list.map((pkg) => [pkg.id, toRowState(pkg)])));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  function updateField(id: string, field: keyof EditableFields, value: string) {
    setSaveMessage('');
    setSaveError('');
    setRows((prev) => {
      const row = prev[id];
      if (!row) return prev;

      if (field === 'name') {
        return {
          ...prev,
          [id]: { ...row, name: truncatePackageName(value), message: null, error: null },
        };
      }

      const parsed = Number(value);
      if (Number.isNaN(parsed)) return prev;

      const clamped = clampPackageNumericField(field as PackageNumericField, parsed);
      return {
        ...prev,
        [id]: { ...row, [field]: clamped, message: null, error: null },
      };
    });
  }

  function resetChangedPackages() {
    setRows(Object.fromEntries(packages.map((pkg) => [pkg.id, toRowState(pkg)])));
    setSaveMessage('');
    setSaveError('');
  }

  function resetPackage(id: string) {
    const pkg = packages.find((item) => item.id === id);
    if (!pkg) return;
    setRows((prev) => ({
      ...prev,
      [id]: toRowState(pkg),
    }));
    setSaveMessage('');
    setSaveError('');
  }

  async function saveChangedPackages() {
    const changedPackages = packages
      .map((pkg) => ({ pkg, row: rows[pkg.id] }))
      .filter(({ pkg, row }) => hasPackageDraftChanged(pkg, row) && row);

    if (changedPackages.length === 0) return;

    setSaveMessage('');
    setSaveError('');
    setRows((prev) => ({
      ...prev,
      ...Object.fromEntries(
        changedPackages.map(({ pkg, row }) => [
          pkg.id,
          { ...row, saving: true, message: null, error: null } as RowState,
        ]),
      ),
    }));

    const results = await Promise.all(
      changedPackages.map(async ({ pkg, row }) => {
        if (!row) {
          return { id: pkg.id, row, ok: false, error: 'Missing draft row', updated: null };
        }
        try {
          const res = await fetch(`/api/admin/packages/${pkg.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: row.name,
              vcpu: row.vcpu,
              ramGb: row.ramGb,
              storageGb: row.storageGb,
              monthlyPriceBdt: row.monthlyPriceBdt,
            }),
          });
          const data: unknown = await res.json();
          if (!res.ok) {
            return {
              id: pkg.id,
              row,
              ok: false,
              error: (data as { error?: string }).error ?? 'Save failed',
              updated: null,
            };
          }

          return {
            id: pkg.id,
            row,
            ok: true,
            error: null,
            updated: enrichPackage(data as AdminPackage, unitPrices),
          };
        } catch {
          return { id: pkg.id, row, ok: false, error: 'Network error', updated: null };
        }
      }),
    );

    const failures = results.filter((result) => !result.ok);
    const successes = results.filter((result) => result.ok && result.updated);

    setRows((prev) => ({
      ...prev,
      ...Object.fromEntries(
        results.map((result) => [
          result.id,
          {
            ...result.row,
            saving: false,
            message: result.ok ? 'Saved' : null,
            error: result.error,
          } as RowState,
        ]),
      ),
    }));

    if (failures.length > 0) {
      if (successes.length > 0) {
        setPackages((prev) =>
          prev.map((pkg) => successes.find((result) => result.id === pkg.id)?.updated ?? pkg),
        );
      }
      setSaveError(
        `${failures.length} ${failures.length === 1 ? 'row needs' : 'rows need'} attention. Fix the highlighted draft and save again.`,
      );
      return;
    }

    await loadPackages();
    setSaveMessage(
      `${results.length} ${results.length === 1 ? 'package was' : 'packages were'} saved.`,
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-on-surface-variant">
        <svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading packages…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-error/20 bg-error-container p-4 text-on-error-container">
        <p>{loadError}</p>
        <button
          type="button"
          onClick={() => void loadPackages()}
          className="mt-3 font-semibold underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const changedPackageIds = packages
    .filter((pkg) => hasPackageDraftChanged(pkg, rows[pkg.id]))
    .map((pkg) => pkg.id);
  const hasChanges = changedPackageIds.length > 0;
  const isSaving = Object.values(rows).some((row) => row.saving);

  return (
    <div className="space-y-4">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Fixed package prices are manually editable. The unit cost column previews what the same spec would
        cost at current per-dimension rates. Delta highlights markup or discount vs listed price.
      </p>

      <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-section-title text-section-title text-on-surface">
            {hasChanges
              ? `${changedPackageIds.length} unsaved ${changedPackageIds.length === 1 ? 'package' : 'packages'}`
              : saveMessage
                ? 'All packages saved'
                : 'No unsaved package changes'}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Save once after editing multiple rows, or reset drafts back to the last saved values.
          </p>
          {saveError && <p className="mt-2 text-sm font-medium text-error">{saveError}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!hasChanges || isSaving} onClick={resetChangedPackages}>
            Reset changes
          </Button>
          <Button loading={isSaving} disabled={!hasChanges || isSaving} onClick={() => void saveChangedPackages()}>
            Save changes
          </Button>
        </div>
      </div>

      {saveMessage && (
        <AdminSaveSuccessBanner
          title="Packages saved"
          message={saveMessage}
          hint="Listed prices update on the packages catalog and configure pages immediately."
          onDismiss={() => setSaveMessage('')}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="min-w-full text-left">
          <thead className="border-b border-outline-variant bg-surface-container-low">
            <tr>
              {['Slug', 'Name', 'vCPU', 'RAM (GB)', 'SSD (GB)', 'Listed ৳/mo', 'Unit cost', 'Delta', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {packages.map((pkg) => {
              const row = rows[pkg.id] ?? toRowState(pkg);
              const unitTotal = previewUnitTotal(row, unitPrices) ?? pkg.unitTotalBdt;
              const delta = row.monthlyPriceBdt - unitTotal;
              const isDirty = changedPackageIds.includes(pkg.id);

              return (
                <tr key={pkg.id} className={['align-top', isDirty ? 'bg-primary/5' : ''].join(' ')}>
                  <td className="px-4 py-4 font-code-inline text-body-sm text-on-surface-variant">{pkg.slug}</td>
                  <td className="px-4 py-3">
                    <input
                      className={inputClass}
                      value={row.name}
                      maxLength={PACKAGE_FIELD_LIMITS.name.maxLength}
                      onChange={(e) => updateField(pkg.id, 'name', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={PACKAGE_FIELD_LIMITS.vcpu.min}
                      max={PACKAGE_FIELD_LIMITS.vcpu.max}
                      step={1}
                      className={inputClass}
                      value={row.vcpu}
                      title={`${PACKAGE_FIELD_LIMITS.vcpu.min}–${PACKAGE_FIELD_LIMITS.vcpu.max} vCPU`}
                      onChange={(e) => updateField(pkg.id, 'vcpu', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={PACKAGE_FIELD_LIMITS.ramGb.min}
                      max={PACKAGE_FIELD_LIMITS.ramGb.max}
                      step={1}
                      className={inputClass}
                      value={row.ramGb}
                      title={`${PACKAGE_FIELD_LIMITS.ramGb.min}–${PACKAGE_FIELD_LIMITS.ramGb.max} GB`}
                      onChange={(e) => updateField(pkg.id, 'ramGb', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={PACKAGE_FIELD_LIMITS.storageGb.min}
                      max={PACKAGE_FIELD_LIMITS.storageGb.max}
                      step={1}
                      className={inputClass}
                      value={row.storageGb}
                      title={`${PACKAGE_FIELD_LIMITS.storageGb.min}–${PACKAGE_FIELD_LIMITS.storageGb.max} GB`}
                      onChange={(e) => updateField(pkg.id, 'storageGb', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={PACKAGE_FIELD_LIMITS.monthlyPriceBdt.min}
                      step={1}
                      className={inputClass}
                      value={row.monthlyPriceBdt}
                      title="Listed monthly price (৳)"
                      onChange={(e) => updateField(pkg.id, 'monthlyPriceBdt', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-4 font-body-sm text-body-sm text-on-surface-variant">
                    ৳{unitTotal.toLocaleString()}
                    <div className="text-xs text-outline">live preview</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={delta >= 0 ? 'text-on-surface' : 'text-error'}>
                      {delta >= 0 ? '+' : ''}৳{delta.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <AdminRowStatusCell
                      isDirty={isDirty}
                      saving={row.saving}
                      message={row.message}
                      error={row.error}
                      onReset={() => resetPackage(pkg.id)}
                      resetDisabled={isSaving}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
