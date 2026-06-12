import { PageHeader } from '@/components/ui/PageHeader';
import { AdminInvoicesTable } from '@/components/admin/AdminInvoicesTable';

export default function AdminInvoicesPage() {
  return (
    <>
      <PageHeader
        title="Invoices"
        description="All customer invoices — filter by payment status"
        breadcrumb={[
          { label: 'Admin', href: '/admin' },
          { label: 'Invoices' },
        ]}
      />
      <AdminInvoicesTable />
    </>
  );
}
