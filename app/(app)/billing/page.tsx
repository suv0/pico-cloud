import Link from 'next/link';
import { db } from '@/lib/db';
import { getValidatedSession } from '@/lib/auth/session';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const session = await getValidatedSession();
  if (!session) return null;

  const invoices = await db.invoice.findMany({
    where: { userId: session.userId },
    include: { resource: { select: { name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const totalUnpaid = invoices
    .filter((inv) => inv.status === 'UNPAID')
    .reduce((sum, inv) => sum + inv.amountBdt, 0);

  return (
    <>
      <PageHeader
        title="Billing History"
        description={
          totalUnpaid > 0
            ? `Outstanding balance: ৳${totalUnpaid.toLocaleString()}`
            : 'Manage your subscriptions and cloud usage invoices.'
        }
      />

      {invoices.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <span className="material-symbols-outlined mx-auto mb-4 block text-[48px] text-outline-variant">
              receipt
            </span>
            <h2 className="mb-2 font-section-title text-section-title text-on-surface">No invoices yet</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Invoices are created automatically when a VM becomes active.
            </p>
            <Link
              href="/packages"
              prefetch={false}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-body-base text-body-base font-semibold text-on-primary hover:opacity-90"
            >
              Provision your first VM
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  {['VM Name', 'Amount', 'Status', 'Date', 'Action'].map((col) => (
                    <th
                      key={col}
                      className={`border-b border-outline-variant px-6 py-4 font-section-title text-section-title text-on-surface-variant ${
                        col === 'Action' ? 'text-right' : ''
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">dns</span>
                        <Link
                          href={`/resources/${inv.resourceId}`}
                          prefetch={false}
                          className="font-code-inline text-code-inline text-on-surface hover:text-primary"
                        >
                          {inv.resource.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-body-base text-body-base text-on-surface">
                      ৳{inv.amountBdt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 font-body-base text-body-base text-on-surface-variant">
                      {new Date(inv.createdAt).toLocaleDateString('en-BD', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/billing/${inv.id}`}
                        className="rounded-lg bg-primary px-4 py-1.5 font-body-sm text-body-sm text-on-primary transition-colors hover:bg-on-primary-fixed-variant"
                      >
                        {inv.status === 'UNPAID' ? 'View Details' : 'View →'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
