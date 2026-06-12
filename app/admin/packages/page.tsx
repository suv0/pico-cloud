import { PageHeader } from '@/components/ui/PageHeader';
import { PackageEditor } from '@/components/admin/PackageEditor';

export default function AdminPackagesPage() {
  return (
    <>
      <PageHeader
        title="Package pricing"
        description="Edit fixed VM tier specs and monthly list prices"
        breadcrumb={[
          { label: 'Admin', href: '/admin' },
          { label: 'Packages' },
        ]}
      />
      <PackageEditor />
    </>
  );
}
