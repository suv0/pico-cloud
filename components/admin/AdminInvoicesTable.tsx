'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type InvoiceStatusFilter = 'ALL' | 'UNPAID' | 'PAID';

type AdminInvoice = {
  id: string;
  amountBdt: number;
  status: string;
  createdAt: string;
  resourceId: string;
  resourceName: string;
  resourceStatus: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
};

const STATUS_FILTERS: { value: InvoiceStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PAID', label: 'Paid' },
];

const STATUS_STYLES: Record<string, string> = {
  UNPAID: 'bg-error-container text-on-error-container',
  PAID: 'bg-primary-container text-on-primary-container',
};

const EMPTY_MESSAGES: Record<InvoiceStatusFilter, string> = {
  ALL: 'No invoices.',
  UNPAID: 'No unpaid invoices.',
  PAID: 'No paid invoices.',
};

function parseStatusFilter(value: string | null): InvoiceStatusFilter {
  if (value === 'UNPAID' || value === 'PAID') return value;
  return 'ALL';
}

function AdminInvoicesTableInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = parseStatusFilter(searchParams.get('status'));

  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInvoices = useCallback(async (filter: InvoiceStatusFilter) => {
    setLoading(true);
    setError('');
    try {
      const query = filter === 'ALL' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/admin/invoices${query}`);
      const data: unknown = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Failed to load invoices');
        return;
      }
      setInvoices(data as AdminInvoice[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoices(statusFilter);
  }, [statusFilter, loadInvoices]);

  const setStatusFilter = (filter: InvoiceStatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', filter);
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/invoices?${qs}` : '/admin/invoices', { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Invoice status filter">
        {STATUS_FILTERS.map(({ value, label }) => {
          const active = statusFilter === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusFilter(value)}
              className={`rounded-full border px-4 py-1.5 font-body-sm text-body-sm transition-colors ${
                active
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-on-surface-variant">
          <svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading invoices…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-error/20 bg-error-container p-4 text-on-error-container">
          {error}
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
          <span className="material-symbols-outlined mb-4 text-4xl text-outline">receipt_long</span>
          <p className="font-body-base text-body-base text-on-surface-variant">
            {EMPTY_MESSAGES[statusFilter]}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                {['Customer', 'VM', 'Amount', 'Created', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-3">
                    <p className="font-body-base text-body-base text-on-surface">{invoice.customerName}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{invoice.customerEmail}</p>
                  </td>
                  <td className="px-6 py-3 font-code-inline text-body-sm">
                    <Link href={`/admin/resources/${invoice.resourceId}`} className="text-primary hover:underline">
                      {invoice.resourceName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 font-body-sm text-body-sm">
                    ৳{invoice.amountBdt.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 font-body-sm text-body-sm text-on-surface-variant">
                    {new Date(invoice.createdAt).toLocaleDateString('en-BD', {
                      dateStyle: 'medium',
                    })}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 font-label-caps text-[10px] uppercase tracking-wider ${
                        STATUS_STYLES[invoice.status] ?? 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/admin/resources/${invoice.resourceId}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
                    >
                      View VM
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminInvoicesTable() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-on-surface-variant">
          <svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading invoices…
        </div>
      }
    >
      <AdminInvoicesTableInner />
    </Suspense>
  );
}
