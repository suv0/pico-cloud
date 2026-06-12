import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';

export async function GET() {
  const session = await getApiAdminSession();
  if (session instanceof NextResponse) return session;

  const rows = await db.unitPrice.findMany({ orderBy: { dimension: 'asc' } });
  return NextResponse.json(rows);
}
