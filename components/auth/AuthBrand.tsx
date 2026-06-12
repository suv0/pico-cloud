import Link from 'next/link';

export function AuthBrand() {
  return (
    <div className="mb-8 flex flex-col items-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-sm">
        <span className="material-symbols-outlined text-3xl text-on-primary">cloud</span>
      </div>
      <Link href="/" className="font-display-title text-display-title text-on-surface tracking-tight">
        PICO Cloud
      </Link>
    </div>
  );
}

export function AuthInfoCards() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-outline-variant bg-surface-container-low/50 p-4 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px] text-primary">security</span>
          <h3 className="font-label-caps text-label-caps uppercase text-on-surface">Enterprise Security</h3>
        </div>
        <p className="text-[12px] leading-snug text-on-surface-variant">
          SOC2-aligned data centers with encryption by default for all VM workloads.
        </p>
      </div>
      <div className="rounded-lg border border-outline-variant bg-surface-container-low/50 p-4 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px] text-primary">speed</span>
          <h3 className="font-label-caps text-label-caps uppercase text-on-surface">Fiber Backbone</h3>
        </div>
        <p className="text-[12px] leading-snug text-on-surface-variant">
          Direct peering with major ISPs in Bangladesh for low-latency self-service cloud.
        </p>
      </div>
    </div>
  );
}

export function AuthFooterLinks() {
  return (
    <footer className="mt-8 flex justify-center gap-6">
      <span className="font-body-sm text-body-sm text-on-surface-variant">Privacy Policy</span>
      <span className="font-body-sm text-body-sm text-on-surface-variant">Terms of Service</span>
    </footer>
  );
}
