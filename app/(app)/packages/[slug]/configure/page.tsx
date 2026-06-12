'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { VmNameInput } from '@/components/forms/VmNameInput';
import { RegionSelect } from '@/components/resources/RegionSelect';
import { QuotaBlockedBanner } from '@/components/billing/QuotaBlockedBanner';
import { DEFAULT_REGION_CODE, type RegionCode } from '@/lib/regions/catalog';
import { isVmNameValid, normalizeVmName, validateVmName, DEFAULT_VM_NAME } from '@/lib/validation/vmName';

type Package = {
  id: string;
  slug: string;
  name: string;
  vcpu: number;
  ramGb: number;
  storageGb: number;
  monthlyPriceBdt: number;
};

type QuotaStatus = {
  blocked: boolean;
  existingResourceId?: string;
  invoiceId?: string | null;
};

export default function ConfigureFixedPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [pkgError, setPkgError] = useState('');
  const [name, setName] = useState(DEFAULT_VM_NAME);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [regionCode, setRegionCode] = useState<RegionCode>(DEFAULT_REGION_CODE);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setPkgError('');
        const pkgRes = await fetch(`/api/packages/${slug}`);
        if (pkgRes.status === 404) {
          setPkgError('Package not found');
          return;
        }
        if (!pkgRes.ok) {
          setPkgError('Failed to load package');
          return;
        }
        const pkgData = await pkgRes.json() as Package;
        setPkg(pkgData);
      } catch {
        setPkgError('Network error — please try again');
      } finally {
        setLoadingPkg(false);
      }
    }
    void load();
  }, [slug]);

  useEffect(() => {
    async function checkQuota() {
      try {
        const res = await fetch('/api/resources/quota-status');
        if (res.ok) {
          const data = await res.json() as QuotaStatus;
          setQuota(data);
        }
      } catch {
        // quota check is best-effort; provision will also block
      }
    }
    void checkQuota();
  }, []);

  async function handleProvision(e: React.FormEvent) {
    e.preventDefault();
    if (!pkg) return;
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
        body: JSON.stringify({ packageId: pkg.id, name: vmName, regionCode }),
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

  if (loadingPkg) return <LoadingSpinner />;

  if (pkgError) {
    return (
      <>
        <PageHeader
          title="Configure package"
          description="Choose a plan from the catalog."
          breadcrumb={[
            { label: 'Packages', href: '/packages' },
            { label: 'Not found' },
          ]}
        />
        <div className="py-16 text-center">
          <p className="font-medium text-error">{pkgError}</p>
          <Link href="/packages" className="mt-4 inline-block text-body-sm text-primary hover:underline">
            ← Browse packages
          </Link>
        </div>
      </>
    );
  }

  if (!pkg) return null;

  const nameMissing = !isVmNameValid(name);

  return (
    <>
      <PageHeader
        title={`Configure ${pkg.name}`}
        description="Name your VM and confirm your plan."
        breadcrumb={[
          { label: 'Packages', href: '/packages' },
          { label: pkg.name },
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
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-container-padding">
              <VmNameInput value={name} onChange={setName} autoFocus />
            </div>

            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-container-padding">
              <h3 className="mb-4 font-section-title text-section-title">Plan specifications</h3>
              <div className="space-y-3">
                {[
                  { icon: 'memory', label: `${pkg.vcpu} vCPU` },
                  { icon: 'storage', label: `${pkg.ramGb} GB RAM` },
                  { icon: 'hard_drive', label: `${pkg.storageGb} GB SSD` },
                  { icon: 'public', label: 'Public IPv4 included' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">{icon}</span>
                    <span className="font-body-sm text-body-sm">{label}</span>
                  </div>
                ))}
              </div>
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
                <div className="font-display-title text-[32px] font-extrabold leading-none text-on-surface">
                  ৳{pkg.monthlyPriceBdt.toLocaleString()}
                </div>
                <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{pkg.name} plan</p>
              </div>

              {error && (
                <p className="mb-4 rounded-lg border border-error-container bg-error-container px-3 py-2 text-body-sm text-error">
                  {error}
                </p>
              )}

              {nameMissing && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-900">
                  Enter a VM name above to enable provisioning.
                </p>
              )}

              <Button
                type="submit"
                loading={loading}
                disabled={!isVmNameValid(name) || quota?.blocked}
                className="w-full shadow-lg shadow-primary/20"
                size="lg"
              >
                {loading ? 'Provisioning…' : `Provision — ৳${pkg.monthlyPriceBdt.toLocaleString()}/mo`}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Invoice created when VM is active</span>
              </div>

              <Link
                href="/packages"
                className="mt-4 block text-center font-body-sm text-body-sm text-primary hover:underline"
              >
                ← Choose a different plan
              </Link>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
