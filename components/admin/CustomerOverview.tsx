'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type CustomerResource = {
  id: string;
  name: string;
  status: string;
  monthlyPriceBdt: number;
};

type Customer = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  resourceCount: number;
  activeResourceCount: number;
  unpaidInvoiceCount: number;
  totalInvoicedBdt: number;
  resources: CustomerResource[];
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-primary-container text-on-primary-container',
  PROVISIONING: 'bg-tertiary-container text-on-tertiary-container',
  PENDING: 'bg-surface-container-high text-on-surface-variant',
  FAILED: 'bg-error-container text-on-error-container',
};

export function CustomerOverview({ initialExpandVms = false }: { initialExpandVms?: boolean }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/customers');
      const data: unknown = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Failed to load customers');
        return;
      }
      const loaded = data as Customer[];
      setCustomers(loaded);
      if (initialExpandVms) {
        setExpandedCustomerIds(new Set(loaded.map((c) => c.id)));
      }
    } finally {
      setLoading(false);
    }
  }, [initialExpandVms]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const toggleCustomer = (customerId: string) => {
    setExpandedCustomerIds((current) => {
      const next = new Set(current);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-on-surface-variant">
        <svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading customers…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error/20 bg-error-container p-4 text-on-error-container">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => void loadCustomers()}
          className="mt-3 font-semibold underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
        <span className="material-symbols-outlined mb-4 text-4xl text-outline">group_off</span>
        <p className="font-body-base text-body-base text-on-surface-variant">No customer accounts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {customers.map((customer) => {
        const isExpanded = expandedCustomerIds.has(customer.id);

        return (
          <div
            key={customer.id}
            className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
          >
            <button
              type="button"
              onClick={() => toggleCustomer(customer.id)}
              className="flex w-full flex-col gap-4 border-b border-outline-variant bg-surface-container-low p-container-padding text-left transition-colors hover:bg-surface-container-high sm:flex-row sm:items-center sm:justify-between"
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-xl text-on-surface-variant transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  aria-hidden="true"
                >
                  chevron_right
                </span>
                <div>
                  <h3 className="font-section-title text-section-title text-on-surface">{customer.displayName}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{customer.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 font-body-sm text-body-sm">
                <span>
                  <strong className="text-on-surface">{customer.resourceCount}</strong> VMs
                </span>
                <span>
                  <strong className="text-on-surface">{customer.activeResourceCount}</strong> active
                </span>
                <span>
                  <strong className="text-on-surface">{customer.unpaidInvoiceCount}</strong> unpaid
                </span>
                <span>
                  ৳<strong className="text-on-surface">{customer.totalInvoicedBdt.toLocaleString()}</strong> invoiced
                </span>
              </div>
            </button>

            {isExpanded && (
              customer.resources.length > 0 ? (
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      {['VM Name', 'Status', 'Monthly', 'Action'].map((h) => (
                        <th key={h} className="px-6 py-3 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {customer.resources.map((resource) => (
                      <tr key={resource.id}>
                        <td className="px-6 py-3 font-code-inline text-body-sm">
                          <Link href={`/admin/resources/${resource.id}`} className="text-primary hover:underline">
                            {resource.name}
                          </Link>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 font-label-caps text-[10px] uppercase tracking-wider ${
                              STATUS_STYLES[resource.status] ?? 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {resource.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-body-sm text-body-sm">
                          ৳{resource.monthlyPriceBdt.toLocaleString()}/mo
                        </td>
                        <td className="px-6 py-3">
                          <Link
                            href={`/admin/resources/${resource.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
                          >
                            View details
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-container-padding font-body-sm text-body-sm text-on-surface-variant">No VMs provisioned.</p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
