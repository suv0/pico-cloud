import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/resources/[id]/route';

vi.mock('@/lib/db', () => ({
  db: {
    resource: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/apiSession', () => ({
  getApiSession: vi.fn(),
}));

import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';

const mockedGetApiSession = vi.mocked(getApiSession);
const mockedFindUnique = vi.mocked(db.resource.findUnique);

describe('GET /api/resources/[id] tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when resource belongs to another user', async () => {
    mockedGetApiSession.mockResolvedValue({ userId: 'user-a', role: 'CUSTOMER' } as never);
    mockedFindUnique.mockResolvedValue({
      id: 'vm-1',
      userId: 'user-b',
      name: 'other-vm',
      package: null,
      invoice: null,
    } as never);

    const res = await GET(
      new NextRequest('http://localhost/api/resources/vm-1'),
      { params: Promise.resolve({ id: 'vm-1' }) },
    );

    expect(res.status).toBe(404);
  });

  it('returns resource when owner matches session', async () => {
    mockedGetApiSession.mockResolvedValue({ userId: 'user-a', role: 'CUSTOMER' } as never);
    mockedFindUnique.mockResolvedValue({
      id: 'vm-1',
      userId: 'user-a',
      name: 'my-vm',
      package: null,
      invoice: { id: 'inv-1', status: 'UNPAID' },
    } as never);

    const res = await GET(
      new NextRequest('http://localhost/api/resources/vm-1'),
      { params: Promise.resolve({ id: 'vm-1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('my-vm');
  });
});
