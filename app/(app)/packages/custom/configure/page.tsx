'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { VmNameInput } from '@/components/forms/VmNameInput';
import { RegionSelect } from '@/components/resources/RegionSelect';
import { QuotaBlockedBanner } from '@/components/billing/QuotaBlockedBanner';
import { DEFAULT_REGION_CODE, type RegionCode } from '@/lib/regions/catalog';
import { calculateCustomPrice, type UnitPrices } from '@/lib/pricing/estimator';
import { isVmNameValid, normalizeVmName, validateVmName, DEFAULT_VM_NAME } from '@/lib/validation/vmName';

type Spec = {
  vcpu: number;
  ramGb: number;
  storageGb: number;
};

type QuotaStatus = {
  blocked: boolean;
  existingResourceId?: string;
  invoiceId?: string | null;
};

const LIMITS = {
  vcpu: { min: 1, max: 16, step: 1, label: 'vCPU', unit: 'Core', unitPlural: 'Cores' },
  ramGb: { min: 2, max: 64, step: 2, label: 'RAM (GB)', unit: 'GB', unitPlural: 'GB' },
  storageGb: { min: 40, max: 500, step: 10, label: 'SSD Storage (GB)', unit: 'GB', unitPlural: 'GB' },
} as const;

type SpecKey = keyof Spec;

function ResourceSlider({
  specKey,
  value,
  onChange,
}: {
  specKey: SpecKey;
  value: number;
  onChange: (v: number) => void;
}) {
  const { min, max, step, label, unit, unitPlural } = LIMITS[specKey];

  function adjust(delta: number) {
    const next = Math.min(max, Math.max(min, value + delta));
    onChange(next);
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-container-padding">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-section-title text-section-title">{label}</span>
        <div className="flex items-center gap-4 rounded-lg border border-outline-variant bg-white px-2 py-1">
          <button
            type="button"
            onClick={() => adjust(-step)}
            disabled={value <= min}
            className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-on-surface-variant">remove</span>
          </button>
          <span className="min-w-[32px] text-center font-code-inline text-code-inline">{value}</span>
          <button
            type="button"
            onClick={() => adjust(step)}
            disabled={value >= max}
            className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-on-surface-variant">add</span>
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-slider"
      />
      <div className="mt-2 flex justify-between font-body-sm text-body-sm text-on-surface-variant">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unitPlural}
        </span>
      </div>
    </div>
  );
}

export default function ConfigureCustomPage() {
  const router = useRouter();

  const [spec, setSpec] = useState<Spec>({ vcpu: 2, ramGb: 8, storageGb: 80 });
  const [unitPrices, setUnitPrices] = useState<UnitPrices | null>(null);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState('');
  const [name, setName] = useState(DEFAULT_VM_NAME);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [regionCode, setRegionCode] = useState<RegionCode>(DEFAULT_REGION_CODE);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  const loadUnitPrices = useCallback(async () => {
    setPricesLoading(true);
    setPricesError('');
    try {
      const res = await fetch('/api/pricing/unit-prices');
      if (!res.ok) {
        setPricesError('Unable to load pricing. Please try again.');
        setUnitPrices(null);
        return;
      }
      const data = await res.json() as UnitPrices;
      setUnitPrices(data);
    } catch {
      setPricesError('Network error loading prices. Please try again.');
      setUnitPrices(null);
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnitPrices();
  }, [loadUnitPrices]);

  useEffect(() => {
    async function checkQuota() {
      try {
        const res = await fetch('/api/resources/quota-status');
        if (res.ok) {
          const data = await res.json() as QuotaStatus;
          setQuota(data);
        }
      } catch {
        // best-effort
      }
    }
    void checkQuota();
  }, []);

  const monthlyPrice = unitPrices ? calculateCustomPrice(spec, unitPrices) : null;
  const canProvision = isVmNameValid(name) && monthlyPrice !== null;
  const nameMissing = !isVmNameValid(name);

  const handleSpecChange = useCallback(<K extends keyof Spec>(key: K, value: Spec[K]) => {
    setSpec((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleProvision(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const vmName = normalizeVmName(name);
    const nameError = validateVmName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customSpec: spec, name: vmName, regionCode }),
      });
      const data = await res.json().catch(() => ({})) as { id?: string; error?: string };
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        setError(data.error ?? 'Failed to provision VM');
        return;
      }
      if (!data.id) {
        setError('Server did not return a resource id');
        return;
      }
      router.push(`/resources/${data.id}?payment=required`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  const vcpuCost = unitPrices ? spec.vcpu * unitPrices.vcpu : 0;
  const ramCost = unitPrices ? spec.ramGb * unitPrices.ram_gb : 0;
  const ssdCost = unitPrices ? spec.storageGb * unitPrices.storage_gb : 0;

  return (
    <>
      <PageHeader
        title="Build a custom VM"
        description="Adjust the sliders. Price updates instantly."
        breadcrumb={[
          { label: 'Packages', href: '/packages' },
          { label: 'Custom' },
        ]}
      />

      {quota?.blocked && quota.existingResourceId && (
        <QuotaBlockedBanner
          existingResourceId={quota.existingResourceId}
          invoiceId={quota.invoiceId ?? null}
        />
      )}

      <form onSubmit={handleProvision} noValidate>
        <div className="grid grid-cols-1 gap-section-gap lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-container-padding">
              <VmNameInput value={name} onChange={setName} autoFocus />
            </div>

            <div className="space-y-4">
              <ResourceSlider
                specKey="vcpu"
                value={spec.vcpu}
                onChange={(v) => handleSpecChange('vcpu', v)}
              />
              <ResourceSlider
                specKey="ramGb"
                value={spec.ramGb}
                onChange={(v) => handleSpecChange('ramGb', v)}
              />
              <ResourceSlider
                specKey="storageGb"
                value={spec.storageGb}
                onChange={(v) => handleSpecChange('storageGb', v)}
              />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding">
              <h2 className="mb-4 font-section-title text-section-title">Order Summary</h2>

              <div className="mb-6">
                <RegionSelect value={regionCode} onChange={setRegionCode} />
              </div>

              <div className="mb-6 rounded-lg border border-primary/10 bg-primary/5 p-6">
                <span className="mb-1 block font-label-caps text-label-caps text-primary">
                  ESTIMATED MONTHLY
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display-title text-[32px] font-extrabold leading-none text-on-surface">
                    ৳{monthlyPrice !== null ? monthlyPrice.toLocaleString() : '—'}
                  </span>
                </div>
              </div>

              {unitPrices && (
                <div className="mb-8 space-y-3">
                  <div className="flex items-center justify-between font-body-base text-body-base">
                    <span className="text-on-surface-variant">
                      {spec.vcpu} × ৳{unitPrices.vcpu} vCPU
                    </span>
                    <span className="font-medium">৳{vcpuCost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between font-body-base text-body-base">
                    <span className="text-on-surface-variant">
                      {spec.ramGb} × ৳{unitPrices.ram_gb} RAM/GB
                    </span>
                    <span className="font-medium">৳{ramCost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between font-body-base text-body-base">
                    <span className="text-on-surface-variant">
                      {spec.storageGb} × ৳{unitPrices.storage_gb} SSD/GB
                    </span>
                    <span className="font-medium">৳{ssdCost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-outline-variant pt-3 font-bold">
                    <span>Total</span>
                    <span>৳{monthlyPrice?.toLocaleString() ?? '—'}</span>
                  </div>
                </div>
              )}

              {pricesError && (
                <div className="mb-4 rounded-lg border border-error-container bg-error-container px-3 py-2 text-body-sm text-error">
                  <p>{pricesError}</p>
                  <button
                    type="button"
                    onClick={() => void loadUnitPrices()}
                    className="mt-2 font-semibold underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {error && (
                <p className="mb-4 rounded-lg border border-error-container bg-error-container px-3 py-2 text-body-sm text-error">
                  {error}
                </p>
              )}

              {nameMissing && !pricesLoading && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-900">
                  Enter a VM name above to enable provisioning.
                </p>
              )}

              <Button type="submit" loading={loading} disabled={!canProvision || pricesLoading} className="w-full shadow-lg shadow-primary/20" size="lg">
                {loading
                  ? 'Provisioning…'
                  : pricesLoading
                    ? 'Loading prices…'
                    : monthlyPrice !== null
                      ? `Provision — ৳${monthlyPrice.toLocaleString()}/mo`
                      : 'Pricing unavailable'}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Provisioning takes ~45 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
