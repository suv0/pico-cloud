import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getAdminCustomers } from '@/app/api/admin/customers/route';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/requireAdmin', () => ({
  getApiAdminSession: vi.fn(),
}));

import { getApiAdminSession } from '@/lib/auth/requireAdmin';

const mockedGetApiAdminSession = vi.mocked(getApiAdminSession);

describe('GET /api/admin/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for customer role', async () => {
    const { NextResponse } = await import('next/server');
    mockedGetApiAdminSession.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );

    const res = await getAdminCustomers(new NextRequest('http://localhost/api/admin/customers'));

    expect(res.status).toBe(403);
  });
});
