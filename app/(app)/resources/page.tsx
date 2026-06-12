import Link from 'next/link';
import { db } from '@/lib/db';
import { getValidatedSession } from '@/lib/auth/session';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { VmRowActionsMenu } from '@/components/resources/VmRowActionsMenu';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  const session = await getValidatedSession();
  if (!session) return null;

  const resources = await db.resource.findMany({
    where: { userId: session.userId },
    include: {
      package: true,
      invoice: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHeader
        title="Virtual Machines"
        description={`${resources.length} total`}
        actions={
          <Link href="/packages" prefetch={false}>
            <Button>
              <Icon name="add" size={18} />
              Create VM
            </Button>
          </Link>
        }
      />

      {resources.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <Icon name="dns" size={48} className="mx-auto mb-4 text-outline-variant" />
            <h2 className="mb-2 font-section-title text-section-title text-on-surface">No VMs yet</h2>
            <p className="mb-6 text-body-sm text-on-surface-variant">
              Provision your first virtual machine to get started.
            </p>
            <Link href="/packages">
              <Button variant="secondary">Browse plans</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card padding={false}>
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low/50">
                  {['Name', 'Status', 'Resources', 'Monthly', 'Actions'].map((col) => (
                    <th
                      key={col}
                      className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {resources.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-6 py-4">
                      <Link
                        href={`/resources/${r.id}`}
                        prefetch={false}
                        className="flex items-center gap-2 font-code-inline text-code-inline font-semibold text-primary hover:underline"
                      >
                        <Icon name="terminal" size={16} />
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        {r.status === 'ACTIVE' && r.invoice?.status === 'UNPAID' && (
                          <StatusBadge status="UNPAID" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-code-inline text-code-inline text-on-surface-variant">
                      {r.vcpu}vCPU / {r.ramGb}GB
                      {r.publicIp && ` · ${r.publicIp}`}
                    </td>
                    <td className="px-6 py-4 font-body-base text-body-base text-on-surface">
                      ৳{r.monthlyPriceBdt.toLocaleString()}/mo
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
        </Card>
      )}
    </>
  );
}
