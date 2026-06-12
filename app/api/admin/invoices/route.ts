import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';

type InvoiceStatusFilter = 'ALL' | 'UNPAID' | 'PAID';

function parseStatusFilter(value: string | null): InvoiceStatusFilter {
  if (value === 'UNPAID' || value === 'PAID') return value;
  return 'ALL';
}

export async function GET(req: NextRequest) {
  const session = await getApiAdminSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  const statusFilter = parseStatusFilter(searchParams.get('status'));

  const invoices = await db.invoice.findMany({
    where: statusFilter === 'ALL' ? {} : { status: statusFilter },
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          status: true,
          user: {
            select: { id: true, email: true, displayName: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = invoices.map((invoice) => ({
    id: invoice.id,
    amountBdt: invoice.amountBdt,
    status: invoice.status,
    createdAt: invoice.createdAt,
    resourceId: invoice.resource.id,
    resourceName: invoice.resource.name,
    resourceStatus: invoice.resource.status,
    customerId: invoice.resource.user.id,
    customerEmail: invoice.resource.user.email,
    customerName: invoice.resource.user.displayName,
  }));

  return NextResponse.json(rows);
}
