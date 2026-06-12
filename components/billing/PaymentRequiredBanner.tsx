'use client';

import { useMemo } from 'react';
import Link from 'next/link';

type PaymentRequiredBannerProps = {
  amountBdt: number;
  invoiceId: string;
  paymentDueAt?: string | null;
  highlight?: boolean;
};

function daysLeft(dueAt: string): number {
  const diff = new Date(dueAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function PaymentRequiredBanner({ amountBdt, invoiceId, paymentDueAt, highlight }: PaymentRequiredBannerProps) {
  const dueText = useMemo(() => {
    if (!paymentDueAt) return null;
    const remaining = daysLeft(paymentDueAt);
    const dateStr = new Date(paymentDueAt).toLocaleDateString('en-BD', { dateStyle: 'long' });
    return remaining === 0
      ? 'Payment overdue \u2014 VM will be suspended soon.'
      : `Pay by ${dateStr} (${remaining} day${remaining !== 1 ? 's' : ''} left) or VM will be suspended.`;
  }, [paymentDueAt]);

  return (
    <div
      id="payment-required-banner"
      className={`mb-section-gap rounded-xl border border-amber-200 bg-amber-50 p-container-padding transition-shadow ${
        highlight ? 'highlight-pulse ring-2 ring-amber-400' : ''
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 text-amber-600">lock</span>
          <div>
            <h2 className="font-section-title text-section-title text-amber-900">Payment required</h2>
            <p className="mt-1 font-body-sm text-body-sm text-amber-800">
              Your VM is running, but console access and live monitoring are locked until the invoice is paid.
            </p>
            {dueText && (
              <p className="mt-1 font-body-sm text-body-sm font-semibold text-amber-900">
                {dueText}
              </p>
            )}
            <p className="mt-2 font-body-base text-body-base font-semibold text-amber-900">
              Amount due: ৳{amountBdt.toLocaleString()}
            </p>
          </div>
        </div>
        <Link
          href={`/billing/${invoiceId}?pay=1`}
          prefetch={false}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-body-base font-semibold text-on-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[18px]">payments</span>
          Pay now
        </Link>
      </div>
    </div>
  );
}
