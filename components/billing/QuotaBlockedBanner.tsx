'use client';

import Link from 'next/link';

type QuotaBlockedBannerProps = {
  existingResourceId: string;
  invoiceId: string | null;
};

export function QuotaBlockedBanner({ existingResourceId, invoiceId }: QuotaBlockedBannerProps) {
  return (
    <div className="mb-section-gap rounded-xl border border-amber-200 bg-amber-50 px-6 py-5">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5">warning</span>
        <div className="space-y-2">
          <h3 className="font-section-title text-section-title text-amber-900">
            You have an unpaid VM — pay or terminate it before creating another
          </h3>
          <p className="font-body-sm text-body-sm text-amber-800">
            A maximum of 1 unpaid VM is allowed. After paying, you can create more VMs. Unpaid VMs are auto-suspended after 7 days.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/resources/${existingResourceId}`}
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 font-body-base font-semibold text-amber-900 transition-colors hover:bg-amber-200"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              View VM
            </Link>
            {invoiceId && (
              <Link
                href={`/billing/${invoiceId}?pay=1`}
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-body-base font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                Pay invoice
              </Link>
            )}
            <Link
              href={`/resources/${existingResourceId}?terminate=1`}
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 font-body-base font-semibold text-amber-900 transition-colors hover:bg-amber-100"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              Cancel VM
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
