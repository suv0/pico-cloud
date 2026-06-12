import Link from 'next/link';
import { db } from '@/lib/db';
import { getValidatedSession } from '@/lib/auth/session';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { VmRowActionsMenu } from '@/components/resources/VmRowActionsMenu';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getValidatedSession();
  if (!session) return null;

  const resources = await db.resource.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      invoice: { select: { id: true, status: true } },
    },
  });

  const unpaidCount = await db.invoice.count({
    where: { userId: session.userId, status: 'UNPAID' },
  });

  const totalVms = await db.resource.count({ where: { userId: session.userId } });
  const activeVms = await db.resource.count({ where: { userId: session.userId, status: 'ACTIVE' } });
  const unpaidResult = await db.invoice.aggregate({
    _sum: { amountBdt: true },
    where: { userId: session.userId, status: 'UNPAID' },
  });
  const unpaidBalance = unpaidResult._sum.amountBdt ?? 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Manage your PICO Cloud infrastructure"
        actions={
          <Link href="/packages" prefetch={false}>
            <Button>
              <Icon name="add" size={18} />
              New VM
            </Button>
          </Link>
        }
      />

      {unpaidCount > 0 && (
        <div className="mb-section-gap space-y-3">
          <div className="bg-tertiary-container text-on-tertiary-container px-4 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-tertiary shadow-sm">
            <div className="flex items-start sm:items-center gap-3">
              <span className="material-symbols-outlined shrink-0">warning</span>
              <div>
                <span className="font-body-base text-body-base block">
                  You have {unpaidCount} unpaid invoice{unpaidCount > 1 ? 's' : ''}
                </span>
                <span className="font-body-sm text-body-sm opacity-90 mt-0.5 block">
                  Demo: pay with test card <span className="font-code-inline text-code-inline">4242 4242 4242 4242</span> to unlock metrics and console.
                </span>
              </div>
            </div>
            <Link href="/billing" className="font-body-base text-body-base font-semibold hover:underline flex items-center gap-1 shrink-0">
              View billing
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-section-gap grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card p-6">
          <p className="font-body-sm text-body-sm text-on-surface-variant">Total VMs</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{totalVms}</p>
          <Icon name="terminal" size={18} className="mt-2 text-on-surface-variant" />
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card p-6">
          <p className="font-body-sm text-body-sm text-on-surface-variant">Active</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{activeVms}</p>
          <Icon name="check-circle" size={18} className="mt-2 text-on-surface-variant" />
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card p-6">
          <p className="font-body-sm text-body-sm text-on-surface-variant">Unpaid</p>
          <p className={`text-2xl font-bold mt-1 ${unpaidBalance > 0 ? 'text-tertiary' : 'text-on-surface-variant'}`}>
            {unpaidBalance > 0 ? '৳' + unpaidBalance.toLocaleString() : '—'}
          </p>
          <Icon name="receipt" size={18} className="mt-2 text-on-surface-variant" />
        </div>
      </div>

      {/* VM Table */}
      <Card padding={false} className="mb-section-gap">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-section-title text-section-title text-on-surface">Recent VMs</h2>
            <Link href="/resources" prefetch={false} className="font-body-sm text-body-sm font-bold text-primary hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        {resources.length === 0 ? (
          <CardBody className="py-12 text-center">
            <p className="mb-4 font-body-base text-body-base text-on-surface-variant">No VMs yet</p>
            <Link href="/packages">
              <Button variant="secondary">Provision your first VM</Button>
            </Link>
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  {['Name', 'Spec', 'Price/mo', 'Status', 'Actions'].map((col) => (
                    <th
                      key={col}
                      className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {resources.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-6 py-4">
                      <Link
                        href={`/resources/${r.id}`}
                        prefetch={false}
                        className="font-code-inline text-code-inline text-primary hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-body-sm text-body-sm text-on-surface-variant">
                      {r.vcpu} vCPU · {r.ramGb} GB RAM · {r.storageGb} GB SSD
                    </td>
                    <td className="px-6 py-4 font-body-base text-body-base text-on-surface">
                      ৳{r.monthlyPriceBdt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        {r.status === 'ACTIVE' && r.invoice?.status === 'UNPAID' && (
                          <StatusBadge status="UNPAID" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <VmRowActionsMenu
                        resourceId={r.id}
                        status={r.status}
                        invoiceId={r.invoice?.id ?? null}
                        invoiceStatus={r.invoice?.status ?? null}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Utilization Bento Row */}
      <div className="grid grid-cols-12 gap-grid-gutter">
        <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-container-padding flex flex-col justify-center">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Total VMs</span>
          <div className="flex items-end gap-2 mb-4">
            <span className="font-display-title text-[32px] leading-none font-bold text-on-surface">{totalVms}</span>
          </div>
          <div className="flex gap-1 h-2">
            {Array.from({ length: Math.min(Math.max(totalVms, 1), 8) }).map((_, i) => (
              <div
                key={i}
                className={`flex-grow rounded-full h-2 ${i < activeVms ? 'bg-primary' : 'bg-outline-variant'}`}
              />
            ))}
          </div>
          <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
            Active: {activeVms} / Total: {totalVms}
          </p>
        </div>
        <div className="col-span-12 md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-container-padding">
          <h3 className="font-section-title text-section-title mb-2">Self-Service Infrastructure</h3>
          <p className="font-body-base text-body-base text-on-surface-variant max-w-md">
            Provision virtual machines instantly with full self-service. No support ticket required.
          </p>
          <Link href="/packages" className="mt-4 inline-flex items-center gap-1 text-primary font-semibold font-body-base hover:underline">
            Browse plans
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </Link>
        </div>
      </div>
    </>
  );
}
