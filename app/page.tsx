import Link from 'next/link';
import { db } from '@/lib/db';
import { getValidatedSession } from '@/lib/auth/session';
import { loadUnitPricesFromDb } from '@/lib/pricing/unitPricesFromDb';
import { Icon } from '@/components/ui/Icon';
import { LandingAuthActions } from '@/components/marketing/LandingAuthActions';
import { LandingPackageCTA } from '@/components/marketing/LandingPackageCTA';

export const dynamic = 'force-dynamic';

async function getPackages() {
  return db.package.findMany({ orderBy: { monthlyPriceBdt: 'asc' } });
}

async function getUnitPricesSafe() {
  try {
    return await loadUnitPricesFromDb();
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const [packages, session, unitPrices] = await Promise.all([
    getPackages(),
    getValidatedSession(),
    getUnitPricesSafe(),
  ]);


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-grid-gutter">
          <span className="font-display-title text-display-title font-bold text-primary">PICO Cloud</span>
          <LandingAuthActions session={session} />
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="hero-gradient relative overflow-hidden text-white">
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-grid-gutter py-32 text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                PICO Public Cloud — Bangladesh&apos;s Fiber@Home infrastructure
              </span>
            </div>
            <h1 className="mb-6 max-w-4xl text-[48px] font-extrabold leading-tight tracking-tight md:text-[64px]">
              Deploy VMs in seconds
            </h1>
            <p className="mb-10 max-w-2xl text-lg text-slate-300 md:text-xl">
              Transparent pricing, instant provisioning, full self-service — no support ticket required.
            </p>
            <LandingAuthActions session={session} variant="hero" />
          </div>
        </section>

        {/* Pricing */}
        <section className="mx-auto mb-24 max-w-7xl px-grid-gutter py-section-gap">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-[32px] font-bold text-on-surface">Simple, transparent pricing</h2>
            <p className="mx-auto max-w-xl font-body-base text-body-base text-on-surface-variant">
              Choose a pre-configured plan or build exactly what you need.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={[
                  'flex flex-col rounded-xl border bg-white p-8 transition-colors',
                  pkg.slug === 'standard'
                    ? 'pricing-card-highlight relative lg:-translate-y-2'
                    : 'border-outline-variant hover:border-primary/50',
                ].join(' ')}
              >
                {pkg.slug === 'standard' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 font-label-caps text-label-caps font-bold uppercase tracking-widest text-on-primary">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-section-title text-section-title text-on-surface mb-1">{pkg.name}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Pre-configured VM</p>
                </div>
                <div className="mb-8">
                  <span className="text-3xl font-bold text-on-surface">
                    ৳{pkg.monthlyPriceBdt.toLocaleString()}
                  </span>
                  <span className="text-on-surface-variant font-body-sm text-body-sm">/mo</span>
                </div>
                <ul className="mb-10 flex-grow space-y-4">
                  {[
                    `${pkg.vcpu} vCPU`,
                    `${pkg.ramGb} GB RAM`,
                    `${pkg.storageGb} GB SSD`,
                    'Public IPv4',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 font-body-sm text-body-sm text-on-surface-variant">
                      <Icon name="check-circle" size={16} className="text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <LandingPackageCTA
                  session={session}
                  packageSlug={pkg.slug}
                  highlighted={pkg.slug === 'standard'}
                />
              </div>
            ))}

            {unitPrices && (
            <div className="flex flex-col rounded-xl bg-slate-900 p-8 text-white">
              <div className="mb-6">
                <h3 className="font-section-title text-section-title mb-1">Custom</h3>
                <p className="font-body-sm text-body-sm text-slate-400">Build your own</p>
              </div>
              <div className="mb-8 space-y-4">
                {([
                  ['vCPU', `৳${unitPrices.vcpu.toLocaleString()}/core`],
                  ['RAM', `৳${unitPrices.ram_gb.toLocaleString()}/GB`],
                  ['SSD', `৳${unitPrices.storage_gb.toLocaleString()}/GB`],
                ] as const).map(([label, price]) => (
                  <div key={label} className="flex items-center justify-between font-body-sm text-body-sm">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-mono text-primary-fixed">{price}</span>
                  </div>
                ))}
              </div>
              <ul className="mb-10 flex-grow space-y-4">
                <li className="flex items-center gap-3 font-body-sm text-body-sm text-slate-400">
                  <Icon name="check-circle" size={16} className="text-slate-500 shrink-0" />
                  1–16 vCPU · 2–64 GB RAM · 40–500 GB SSD
                </li>
                <li className="flex items-center gap-3 font-body-sm text-body-sm text-slate-400">
                  <Icon name="check-circle" size={16} className="text-slate-500 shrink-0" />
                  Public IPv4
                </li>
              </ul>
              <LandingPackageCTA session={session} packageSlug="custom" />
            </div>
            )}
          </div>
        </section>

        {/* Bento Grid Feature Section */}
        <section className="bg-surface-container-low py-24">
          <div className="max-w-7xl mx-auto px-grid-gutter">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ gridAutoRows: '240px' }}>
              {/* Large fiber card */}
              <div className="md:col-span-2 md:row-span-2 bg-white rounded-xl border border-outline-variant p-10 flex flex-col justify-between overflow-hidden relative">
                <div className="relative z-10">
                  <h4 className="font-display-title text-display-title mb-4">Fiber-Backbone Connectivity</h4>
                  <p className="text-on-surface-variant font-body-base text-body-base max-w-md">
                    Our infrastructure is physically colocated within Fiber@Home&apos;s secure data centers,
                    offering unmatched latency and direct peering with every major ISP in Bangladesh.
                  </p>
                </div>
                <div className="mt-8 flex gap-4 relative z-10">
                  <div className="flex-shrink-0 w-32 h-20 bg-primary-container rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-3xl">router</span>
                  </div>
                  <div className="flex-shrink-0 w-32 h-20 bg-secondary-container rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-3xl">speed</span>
                  </div>
                  <div className="flex-shrink-0 w-32 h-20 bg-tertiary-container rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-3xl">hub</span>
                  </div>
                </div>
              </div>
              {/* 99.9% Uptime */}
              <div className="bg-white rounded-xl border border-outline-variant p-8 flex flex-col justify-center text-center">
                <div className="text-primary font-bold text-4xl mb-2">99.99%</div>
                <div className="text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider">Uptime SLA</div>
              </div>
              {/* <2ms */}
              <div className="bg-white rounded-xl border border-outline-variant p-8 flex flex-col justify-center text-center">
                <div className="text-secondary font-bold text-4xl mb-2">&lt; 2ms</div>
                <div className="text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider">Local Latency</div>
              </div>
              {/* Compliance */}
              <div className="bg-primary text-on-primary rounded-xl p-8 flex flex-col justify-end cursor-pointer relative overflow-hidden">
                <span className="material-symbols-outlined mb-4 text-3xl">verified_user</span>
                <h4 className="font-section-title text-section-title text-lg mb-1">Local Compliance</h4>
                <p className="text-on-primary-container font-body-sm text-body-sm">Data sovereignty guaranteed within BD jurisdiction.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-surface-container-lowest py-8">
        <div className="mx-auto max-w-7xl px-grid-gutter">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              PICO Cloud — Fiber@Home Global Ltd. — Take-home demo by Abdul Hamid Shuvo
            </p>
            <div className="flex gap-6">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Privacy (Demo)</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Terms (Demo)</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Docs (Demo)</span>
              <Link
                href="/status"
                prefetch={false}
                className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary"
              >
                Platform status
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
