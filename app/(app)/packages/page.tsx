import Link from 'next/link';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { loadUnitPricesFromDb } from '@/lib/pricing/unitPricesFromDb';

export const dynamic = 'force-dynamic';

async function getUnitPricesSafe() {
  try {
    return await loadUnitPricesFromDb();
  } catch {
    return null;
  }
}

export default async function PackagesPage() {
  const [packages, unitPrices] = await Promise.all([
    db.package.findMany({ orderBy: { monthlyPriceBdt: 'asc' } }),
    getUnitPricesSafe(),
  ]);

  return (
    <>
      <PageHeader
        title="Choose a VM"
        description="Select a pre-configured plan or build a custom VM"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => (
          <div key={pkg.id} className={[
            'bg-surface-container-lowest rounded-xl p-container-padding flex flex-col transition-all duration-200',
            pkg.slug === 'standard'
              ? 'border-2 border-primary relative shadow-lg'
              : 'border border-outline-variant hover:border-outline',
          ].join(' ')}>
            {pkg.slug === 'standard' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full font-label-caps text-[10px] uppercase tracking-widest">
                Recommended
              </div>
            )}
            <div className="flex justify-between items-start mb-6">
              <div className={`p-2 rounded-lg ${pkg.slug === 'standard' ? 'bg-primary-container' : 'bg-surface-container'}`}>
                <span className={`material-symbols-outlined ${pkg.slug === 'standard' ? 'text-on-primary-container' : 'text-primary'}`}>
                  developer_board
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-label-caps text-label-caps uppercase ${pkg.slug === 'standard' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {pkg.name}
              </span>
            </div>
            <h3 className="font-section-title text-section-title mb-1">{pkg.name}</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Pre-configured VM for your workloads.</p>
            <div className="space-y-3 mb-8 flex-grow">
              {[
                { icon: 'memory', label: `${pkg.vcpu} vCPU` },
                { icon: 'storage', label: `${pkg.ramGb} GB RAM` },
                { icon: 'hard_drive', label: `${pkg.storageGb} GB SSD` },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm ${pkg.slug === 'standard' ? 'text-primary' : 'text-outline'}`}>{icon}</span>
                  <span className="font-body-sm text-body-sm">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto">
              <div className="mb-4">
                <span className="text-2xl font-bold text-on-surface">৳{pkg.monthlyPriceBdt.toLocaleString()}</span>
                <span className="text-on-surface-variant font-body-sm text-body-sm">/mo</span>
              </div>
              <Link
                href={`/packages/${pkg.slug}/configure`}
                prefetch={false}
                className={[
                  'block w-full rounded-lg py-2.5 text-center font-section-title text-section-title transition-colors',
                  pkg.slug === 'standard'
                    ? 'bg-primary text-white hover:bg-on-primary-fixed-variant shadow-sm'
                    : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
                ].join(' ')}
              >
                Select
              </Link>
            </div>
          </div>
        ))}

        {/* Custom card */}
        {unitPrices && (
        <div className="bg-surface-container-low border border-dashed border-outline rounded-xl p-container-padding flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container hover:border-primary transition-all duration-300">
          <div className="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">settings_input_component</span>
          </div>
          <h3 className="font-section-title text-section-title mb-2">Custom Build</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant px-4 mb-4">
            Configure specific CPU, RAM, and storage amounts.
          </p>
          <div className="mb-6 w-full space-y-2 px-4 text-left">
            {[
              { label: 'vCPU', rate: unitPrices.vcpu, suffix: '/core' },
              { label: 'RAM', rate: unitPrices.ram_gb, suffix: '/GB' },
              { label: 'SSD', rate: unitPrices.storage_gb, suffix: '/GB' },
            ].map(({ label, rate, suffix }) => (
              <div
                key={label}
                className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant"
              >
                <span>{label}</span>
                <span className="font-mono text-primary">
                  ৳{rate.toLocaleString()}
                  {suffix}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/packages/custom/configure"
            className="bg-on-surface text-surface py-2 px-6 rounded-lg font-section-title text-section-title hover:bg-black transition-colors"
          >
            Configure
          </Link>
        </div>
        )}
      </div>

      <section className="mt-section-gap grid grid-cols-1 gap-element-gap md:grid-cols-3">
        <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest md:col-span-2 md:flex-row">
          <div className="flex w-full flex-col justify-center p-container-padding md:w-1/2">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-primary">language</span>
              <span className="font-label-caps text-label-caps uppercase text-primary">Bangladesh Region</span>
            </div>
            <h4 className="mb-4 font-display-title text-display-title">Deploy in Dhaka</h4>
            <p className="mb-6 font-body-base text-body-base text-on-surface-variant">
              VMs run in Fiber@Home data centers with sub-millisecond latency inside Bangladesh.
            </p>
          </div>
          <div className="relative min-h-[200px] w-full bg-surface-container-low md:w-1/2">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(#004ac6 0.5px, transparent 0.5px)',
                backgroundSize: '16px 16px',
              }}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-primary p-container-padding text-on-primary">
          <div>
            <span className="material-symbols-outlined mb-6 text-4xl">verified_user</span>
            <h4 className="mb-2 font-section-title text-section-title">99.99% Uptime SLA</h4>
            <p className="font-body-sm text-body-sm leading-relaxed text-primary-fixed opacity-90">
              Enterprise-grade reliability built into every tier for production workloads.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
