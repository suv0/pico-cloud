import { PageHeader } from '@/components/ui/PageHeader';
import { CustomerOverview } from '@/components/admin/CustomerOverview';

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ expand?: string }>;
}) {
  const { expand } = await searchParams;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Registered users, their VMs, and billing summary"
        breadcrumb={[
          { label: 'Admin', href: '/admin' },
          { label: 'Customers' },
        ]}
      />
      <CustomerOverview initialExpandVms={expand === 'vms'} />
    </>
  );
}
