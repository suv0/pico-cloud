'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PaymentCheckout } from '@/components/billing/PaymentCheckout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type Invoice = {
  id: string;
  amountBdt: number;
  status: string;
  paidAt: string | null;
  paymentReference: string | null;
  cardLast4: string | null;
  createdAt: string;
  resource: {
    id: string;
    name: string;
    vcpu: number;
    ramGb: number;
    storageGb: number;
    monthlyPriceBdt: number;
    status: string;
    package: { name: string } | null;
  };
};

type PayPayload = {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
};

function InvoiceDetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoOpenPay = searchParams.get('pay') === '1';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) {
          setError('Invoice not found');
          return;
        }
        const data = await res.json() as Invoice;
        setInvoice(data);
      } catch {
        setError('Network error — please try again');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, router]);

  async function handlePay(payload: PayPayload) {
    setPaying(true);
    setPayError('');
    try {
      const res = await fetch(`/api/invoices/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({})) as Partial<Invoice> & {
        error?: string;
      };
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        setPayError(data.error ?? 'Payment failed');
        return;
      }
      if (!data.id) {
        setPayError('Invalid response from server');
        return;
      }
      const resourceId = data.resource?.id ?? invoice?.resource.id;
      if (resourceId) {
        router.push(`/resources/${resourceId}?paid=1`);
        return;
      }
      setInvoice((prev) => {
        if (!prev) return data as Invoice;
        return {
          ...prev,
          ...data,
          resource: data.resource ?? prev.resource,
        };
      });
    } catch {
      setPayError('Network error — please try again');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="font-medium text-error">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 block w-full text-body-sm text-primary hover:underline"
        >
          Try again
        </button>
        <Link href="/billing" prefetch={false} className="mt-2 inline-block text-body-sm text-primary hover:underline">
          ← Billing
        </Link>
      </div>
    );
  }

  if (!invoice) return null;

  const planName = invoice.resource.package?.name ?? 'Custom';
  const isPaid = invoice.status === 'PAID';

  return (
    <>
      <style>{`
        @media print {
          .invoice-print-root nav,
          .invoice-print-root button,
          .invoice-print-root .no-print {
            display: none !important;
          }
          .invoice-print-root {
            max-width: 100%;
          }
        }
      `}</style>
      <div className="mx-auto max-w-5xl invoice-print-root">
      <nav className="mb-4 flex items-center gap-2 text-xs text-on-surface-variant">
        <Link href="/billing" prefetch={false} className="hover:text-primary">
          Billing
        </Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="font-medium text-on-surface">
          Invoice #{invoice.id.slice(0, 8).toUpperCase()}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-section-gap lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="border-b border-outline-variant px-8 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display-title text-display-title text-on-surface">Invoice Detail</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">dns</span>
                      <Link
                        href={`/resources/${invoice.resource.id}`}
                        className="font-code-inline text-code-inline hover:text-primary"
                      >
                        {invoice.resource.name}
                      </Link>
                    </div>
                    <span className="h-1 w-1 rounded-full bg-outline-variant" />
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{planName}</span>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
                <Link
                  href="/billing"
                  prefetch={false}
                  className="material-symbols-outlined rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
                  aria-label="Back to billing"
                >
                  close
                </Link>
              </div>
            </div>

            {isPaid && (
              <div className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-8 py-4 text-emerald-900">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <div>
                  <span className="font-section-title text-section-title">Payment complete. Thank you!</span>
                  {invoice.paymentReference && (
                    <p className="mt-0.5 font-body-sm text-body-sm text-emerald-800">
                      Reference {invoice.paymentReference}
                      {invoice.cardLast4 ? ` · Visa ****${invoice.cardLast4}` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-6 px-8 py-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-section-title text-section-title text-on-surface">Monthly Service Plan</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Issued {new Date(invoice.createdAt).toLocaleDateString('en-BD', { dateStyle: 'long' })}
                  </p>
                </div>
                <span className="font-code-inline text-code-inline text-on-surface">
                  ৳{invoice.amountBdt.toLocaleString()}
                </span>
              </div>

              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <div className="grid grid-cols-2 gap-3 font-body-sm text-body-sm">
                  <div>
                    <span className="text-on-surface-variant">vCPU</span>
                    <p className="font-medium text-on-surface">{invoice.resource.vcpu}</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">RAM</span>
                    <p className="font-medium text-on-surface">{invoice.resource.ramGb} GB</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">Storage</span>
                    <p className="font-medium text-on-surface">{invoice.resource.storageGb} GB</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">VM status</span>
                    <p className="font-medium text-on-surface">{invoice.resource.status}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-outline-variant pt-6">
                <div className="mb-2 flex justify-between font-body-base text-body-base">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span className="text-on-surface">৳{invoice.amountBdt.toLocaleString()}</span>
                </div>
                <div className="mb-2 flex justify-between font-body-base text-body-base">
                  <span className="text-on-surface-variant">Tax (0%)</span>
                  <span className="text-on-surface">৳0</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant pt-4">
                  <span className="font-section-title text-display-title text-on-surface">Total Due</span>
                  <span className="font-display-title text-display-title text-primary">
                    ৳{invoice.amountBdt.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {isPaid && (
              <div className="border-t border-outline-variant bg-surface-container-low px-8 py-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-emerald-600">receipt_long</span>
                    Paid receipt on file
                    {invoice.paymentReference && (
                      <span className="font-code-inline text-code-inline text-on-surface">
                        {invoice.paymentReference}
                        {invoice.cardLast4 ? ` · ****${invoice.cardLast4}` : ''}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/resources/${invoice.resource.id}`}
                    className="rounded-lg border border-outline-variant px-6 py-2.5 font-body-base text-body-base text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    Back to VM
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 no-print">
          {!isPaid ? (
            <PaymentCheckout
              amountBdt={invoice.amountBdt}
              paying={paying}
              payError={payError}
              onPay={handlePay}
              defaultOpen={autoOpenPay}
              embedded
            />
          ) : (
            <PaymentCheckout
              amountBdt={invoice.amountBdt}
              paying={false}
              payError=""
              onPay={handlePay}
              embedded
              paidReference={invoice.paymentReference}
              cardLast4={invoice.cardLast4}
            />
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <InvoiceDetailInner />
    </Suspense>
  );
}
