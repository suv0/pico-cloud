'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { ViewerMode } from '@/lib/billing/isPaymentRequired';
import { getRegion } from '@/lib/regions/catalog';

type VmManagePanelProps = {
  open: boolean;
  onClose: () => void;
  resource: {
    id: string;
    name: string;
    status: string;
    publicIp: string | null;
    regionCode: string;
    monthlyPriceBdt: number;
    invoice?: { id: string; status: string; amountBdt?: number } | null;
  };
  backHref: string;
  backLabel: string;
  viewerMode?: ViewerMode;
  paymentRequired: boolean;
  customerAccessLimited?: boolean;
  onOpenConsole: () => void;
  onHighlightSpecs?: () => void;
};

export function VmManagePanel({
  open,
  onClose,
  resource,
  backHref,
  backLabel,
  viewerMode = 'customer',
  paymentRequired,
  customerAccessLimited = false,
  onOpenConsole,
  onHighlightSpecs,
}: VmManagePanelProps) {
  const router = useRouter();
  const region = getRegion(resource.regionCode);
  const invoice = resource.invoice;
  const isAdmin = viewerMode === 'admin';
  const invoiceHref = isAdmin ? '/admin/invoices' : `/billing/${invoice?.id ?? ''}`;

  useEffect(() => {
    if (!open) return;

    onHighlightSpecs?.();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onHighlightSpecs]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="vm-manage-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close manage panel"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-outline-variant bg-surface-container-lowest shadow-card">
        <div className="flex items-center justify-between border-b border-outline-variant px-container-padding py-ui-md">
          <h2 id="vm-manage-title" className="font-section-title text-section-title text-on-surface">
            Manage VM
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="material-symbols-outlined rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Close"
          >
            close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-container-padding">
          <section>
            <h3 className="mb-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Overview</h3>
            <dl className="space-y-3">
              {[
                { label: 'Name', value: resource.name },
                { label: 'Status', value: <StatusBadge status={resource.status} /> },
                { label: 'Public IP', value: resource.publicIp ?? '—' },
                { label: 'Region', value: region.label },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="font-body-sm text-body-sm text-on-surface-variant">{label}</dt>
                  <dd className="font-body-sm text-body-sm font-medium text-on-surface">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="mb-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Billing</h3>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <div className="flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Monthly</span>
                <span className="font-semibold text-primary">৳{resource.monthlyPriceBdt.toLocaleString()}</span>
              </div>
              {invoice && (
                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/40 pt-3">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Invoice</span>
                  <StatusBadge status={invoice.status} />
                </div>
              )}
              {isAdmin && customerAccessLimited && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="font-body-sm text-body-sm text-amber-800">
                    Customer has not paid this invoice. Console and live metrics remain locked for
                    them until payment is received.
                  </p>
                  <Link
                    href="/admin/invoices?status=UNPAID"
                    prefetch={false}
                    className="mt-2 inline-flex items-center gap-1 font-body-sm text-body-sm font-semibold text-primary hover:underline"
                  >
                    View unpaid invoices
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              )}
              {paymentRequired && !isAdmin && invoice && (
                <Link
                  href={`/billing/${invoice.id}?pay=1`}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-body-base font-semibold text-on-primary transition-colors hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  Pay now
                </Link>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Actions</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentRequired && !isAdmin && invoice) {
                    router.push(`/billing/${invoice.id}?pay=1`);
                    return;
                  }
                  onOpenConsole();
                  onClose();
                }}
                disabled={!resource.publicIp && !paymentRequired}
                title={
                  paymentRequired && !isAdmin
                    ? 'Pay invoice to unlock console access'
                    : !resource.publicIp
                      ? 'Public IP not assigned yet'
                      : 'Open demo console'
                }
                className="flex w-full items-center gap-3 rounded-lg border border-outline-variant px-4 py-3 font-body-base text-body-base text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">terminal</span>
                {paymentRequired && !isAdmin ? 'Pay to unlock console' : 'Open console'}
              </button>

              {invoice && (
                <Link
                  href={invoiceHref}
                  className="flex w-full items-center gap-3 rounded-lg border border-outline-variant px-4 py-3 font-body-base text-body-base text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                    {invoice.status === 'PAID' ? 'receipt_long' : 'receipt'}
                  </span>
                  {isAdmin
                    ? 'View in admin invoices'
                    : invoice.status === 'PAID'
                      ? 'View receipt'
                      : 'View invoice'}
                </Link>
              )}

              <Link
                href={backHref}
                className="flex w-full items-center gap-3 rounded-lg border border-outline-variant px-4 py-3 font-body-base text-body-base text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">arrow_back</span>
                Back to {backLabel}
              </Link>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
