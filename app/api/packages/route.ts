import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const packages = await db.package.findMany({
    orderBy: { monthlyPriceBdt: 'asc' },
  });
  return NextResponse.json(packages);
}
