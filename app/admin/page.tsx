import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const [packageCount, unitPriceCount, customerCount, resourceCount, unpaidInvoices] = await Promise.all([
    db.package.count(),
    db.unitPrice.count(),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.resource.count(),
    db.invoice.count({ where: { status: 'UNPAID' } }),
  ]);

  const cards = [
    {
      label: 'Fixed packages',
      value: packageCount,
      href: '/admin/packages',
      icon: 'inventory_2',
      description: 'Edit tier specs and listed prices',
    },
    {
      label: 'Unit price dimensions',
      value: unitPriceCount,
      href: '/admin/unit-prices',
      icon: 'payments',
      description: 'Rates for custom VM calculator',
    },
    {
      label: 'Customers',
      value: customerCount,
      href: '/admin/customers',
      icon: 'group',
      description: 'Accounts, VMs, and invoice status',
    },
    {
      label: 'Total VMs',
      value: resourceCount,
      href: '/admin/customers?expand=vms',
      icon: 'dns',
      description: 'All provisioned resources',
    },
    {
      label: 'Unpaid invoices',
      value: unpaidInvoices,
      href: '/admin/invoices?status=UNPAID',
      icon: 'receipt_long',
      description: 'Across all customers',
    },
  ];

  return (
    <>
      <PageHeader
        title="Admin Overview"
        description="Hybrid pricing console — fixed packages with manual prices, custom VMs from unit rates"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            prefetch={false}
            className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding transition-all hover:border-primary hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="material-symbols-outlined text-3xl text-primary">{card.icon}</span>
              <span className="font-display-title text-display-title text-on-surface">{card.value}</span>
            </div>
            <h3 className="mb-1 font-section-title text-section-title text-on-surface group-hover:text-primary">
              {card.label}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{card.description}</p>
          </Link>
        ))}
      </div>

      <section className="mt-section-gap rounded-xl border border-outline-variant bg-surface-container-low p-container-padding">
        <h2 className="mb-2 font-section-title text-section-title">Hybrid pricing model</h2>
        <p className="font-body-base text-body-base text-on-surface-variant">
          Fixed packages (Starter, Standard, Pro) use a stored monthly price that admins can set independently
          of unit rates — useful for promotional tiers. Custom VMs always multiply live unit prices by spec at
          provision time. The package editor shows unit-cost preview so you can spot drift between listed and
          calculated prices.
        </p>
      </section>
    </>
  );
}
