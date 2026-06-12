'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';

type AdminBillingStatusBannerProps = {
  amountBdt: number;
};

export function AdminBillingStatusBanner({ amountBdt }: AdminBillingStatusBannerProps) {
  return (
    <div className="mb-section-gap rounded-xl border border-amber-200 bg-amber-50 p-container-padding">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined mt-0.5 text-amber-600">info</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-section-title text-section-title text-amber-900">Payment pending</h2>
          <p className="mt-1 font-body-sm text-body-sm text-amber-800">
            The customer has not paid this invoice. Console and live metrics remain locked for the
            customer until the invoice is paid. You can still inspect this VM as admin.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="font-body-base text-body-base font-semibold text-amber-900">
              Amount due: ৳{amountBdt.toLocaleString()}
            </p>
            <StatusBadge status="UNPAID" />
            <Link
              href="/admin/invoices?status=UNPAID"
              prefetch={false}
              className="font-body-sm text-body-sm font-semibold text-primary hover:underline"
            >
              View unpaid invoices →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
