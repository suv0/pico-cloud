import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';

export async function GET() {
  const session = await getApiAdminSession();
  if (session instanceof NextResponse) return session;

  const users = await db.user.findMany({
    where: { role: 'CUSTOMER' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      displayName: true,
      createdAt: true,
      resources: {
        select: {
          id: true,
          name: true,
          status: true,
          monthlyPriceBdt: true,
          invoice: {
            select: { status: true, amountBdt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const customers = users.map((user) => {
    const invoices = user.resources
      .map((r) => r.invoice)
      .filter((inv): inv is NonNullable<typeof inv> => inv !== null);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      resourceCount: user.resources.length,
      activeResourceCount: user.resources.filter((r) => r.status === 'ACTIVE').length,
      unpaidInvoiceCount: invoices.filter((inv) => inv.status === 'UNPAID').length,
      totalInvoicedBdt: invoices.reduce((sum, inv) => sum + inv.amountBdt, 0),
      resources: user.resources.map(({ invoice: _invoice, ...resource }) => resource),
    };
  });

  return NextResponse.json(customers);
}
