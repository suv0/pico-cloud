import { PageHeader } from '@/components/ui/PageHeader';
import { UnitPriceEditor } from '@/components/admin/UnitPriceEditor';

export default function AdminUnitPricesPage() {
  return (
    <>
      <PageHeader
        title="Unit prices"
        description="Per-dimension rates for the custom VM configurator"
        breadcrumb={[
          { label: 'Admin', href: '/admin' },
          { label: 'Unit Prices' },
        ]}
      />
      <UnitPriceEditor />
    </>
  );
}
